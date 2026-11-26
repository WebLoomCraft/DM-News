import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ApiError } from "./api";
import { LIMITS } from "./config";

/**
 * Media storage.
 *
 * On a long-lived server (Docker, a VM, local dev) uploads land in ./uploads
 * and are streamed back by /api/media/file/<filename>.
 *
 * On Vercel the filesystem is read-only apart from /tmp, and /tmp disappears
 * with the instance — an uploaded logo would silently 404 later. So when
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are present (and/or VERCEL is set)
 * we push the binary to Supabase Storage and hand back a public URL instead.
 */

export const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * File-signature ("magic byte") validation.
 *
 * The client-supplied Content-Type and the filename extension are both
 * attacker controlled, so neither may decide what a file is. We inspect the
 * actual leading bytes and require them to match one of the image formats we
 * accept. SVG is deliberately excluded: it is an executable document format
 * that can carry script.
 *
 * GIF is accepted but flagged as `requiresReencode` — see saveUpload.
 */
export type DetectedType = {
  mime: string;
  ext: string;
  /** True when the format can contain script-bearing or polyglot payloads. */
  requiresReencode: boolean;
};

export function detectImageType(buffer: Buffer): DetectedType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg", requiresReencode: false };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mime: "image/png", ext: "png", requiresReencode: false };
  }
  // RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp", requiresReencode: false };
  }
  // GIF87a / GIF89a — a GIF header can be prepended to arbitrary payloads
  // (including HTML/JS) and still render, so GIFs are normalised on save.
  if (buffer.length >= 6 && (buffer.toString("ascii", 0, 6) === "GIF87a" || buffer.toString("ascii", 0, 6) === "GIF89a")) {
    return { mime: "image/gif", ext: "gif", requiresReencode: true };
  }
  // AVIF / HEIF: ....ftypavif | ftypavis | ftypheic | ftypmif1
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12);
    if (["avif", "avis", "heic", "heix", "mif1", "msf1"].includes(brand)) {
      return { mime: "image/avif", ext: "avif", requiresReencode: false };
    }
  }
  return null;
}

/**
 * Strips anything appended after a complete image stream.
 *
 * A valid GIF/JPEG followed by an HTML document is a classic polyglot that
 * passes signature checks but is served as a document by some clients. Since
 * trailing bytes are never part of a legitimate single image, truncating at
 * the declared end removes the payload without re-encoding.
 */
export function truncateToImageEnd(buffer: Buffer, mime: string): Buffer | null {
  try {
    if (mime === "image/jpeg") {
      // Walk JPEG segments to the EOI marker (FFD9).
      let offset = 2;
      while (offset < buffer.length - 1) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = buffer[offset + 1]!;
        if (marker === 0xd9) return buffer.subarray(0, offset + 2);
        if (marker >= 0xd0 && marker <= 0xd7) {
          offset += 2;
          continue;
        }
        if (marker === 0x01) {
          offset += 2;
          continue;
        }
        const len = buffer.readUInt16BE(offset + 2);
        if (marker === 0xda) {
          // Start of scan: entropy-coded data follows until EOI.
          let scan = offset + 2 + len;
          while (scan < buffer.length - 1) {
            if (buffer[scan] === 0xff && buffer[scan + 1] === 0xd9) {
              return buffer.subarray(0, scan + 2);
            }
            scan += 1;
          }
          return null;
        }
        offset += 2 + len;
      }
      return null;
    }
    if (mime === "image/png") {
      // PNG ends with IEND + fixed CRC.
      const iend = buffer.lastIndexOf(Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]));
      if (iend === -1) return null;
      return buffer.subarray(0, iend + 8);
    }
    if (mime === "image/gif") {
      /*
       * A GIF header followed by arbitrary payload is a well-known polyglot:
       * browsers render the image while a second parser sees the appended
       * document. Require a real trailer and a plausible minimum structure,
       * then cut everything after the LAST trailer byte.
       */
      if (buffer.length < 14) return null;
      const trailer = buffer.lastIndexOf(0x3b);
      if (trailer < 13) return null; // no valid image data + trailer
      return buffer.subarray(0, trailer + 1);
    }
    if (mime === "image/webp") {
      if (buffer.length < 12) return null;
      const declared = buffer.readUInt32LE(4) + 8;
      if (declared > buffer.length) return null;
      return buffer.subarray(0, declared);
    }
  } catch {
    return null;
  }
  return buffer;
}


const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "media";

/** True when uploads should be persisted to Supabase Storage. */
export function remoteStorageEnabled(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function safeExt(name: string, mime: string): string {
  const fromMime = IMAGE_TYPES[mime];
  if (fromMime) return fromMime;
  const ext = path.extname(name).replace(".", "").toLowerCase();
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : "bin";
}

async function ensureRoot() {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
}

/** Reads image dimensions straight from the binary header – no native deps. */
export function readImageDimensions(buffer: Buffer, mime: string): { width: number | null; height: number | null } {
  try {
    if (mime === "image/png" && buffer.length > 24 && buffer.toString("ascii", 12, 16) === "IHDR") {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (mime === "image/gif") {
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
    }
    if (mime === "image/webp" && buffer.length > 30) {
      const fmt = buffer.toString("ascii", 12, 16);
      if (fmt === "VP8X") {
        const width = 1 + buffer.readUIntLE(24, 3);
        const height = 1 + buffer.readUIntLE(27, 3);
        return { width, height };
      }
      if (fmt === "VP8 ") {
        return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
      }
    }
    if ((mime === "image/jpeg" || mime === "image/jpg") && buffer.length > 4) {
      let offset = 2;
      while (offset < buffer.length - 9) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = buffer[offset + 1];
        const len = buffer.readUInt16BE(offset + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        }
        offset += 2 + len;
      }
    }
  } catch {
    /* ignore – dimensions are optional metadata */
  }
  return { width: null, height: null };
}

export type StoredFile = {
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  relativePath: string;
};

/**
 * Uploads a binary to Supabase Storage using the service-role key.
 * Returns the public URL, or null when the bucket is not publicly readable.
 */
async function uploadToSupabase(filename: string, buffer: Buffer, mime: string): Promise<string | null> {
  const objectPath = `${new Date().getUTCFullYear()}/${filename}`;
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${objectPath}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-upsert": "true",
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ApiError(
      502,
      `Supabase Storage rejected the upload (${response.status}). Create a public bucket named "${STORAGE_BUCKET}" and retry. ${detail
        .slice(0, 200)
        .trim()}`.trim(),
    );
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${objectPath}`;
}

export async function saveUpload(file: File): Promise<StoredFile> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ApiError(413, `Image is too large. Maximum ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB per image.`);
  }
  if (file.size === 0) throw new ApiError(422, "The uploaded file is empty");

  const original = Buffer.from(await file.arrayBuffer());

  /*
   * Trust the bytes, not the client. The declared MIME type is used only as a
   * hint for the error message; the format is decided by the file signature.
   */
  const detected = detectImageType(original);
  if (!detected) {
    throw new ApiError(415, "Unsupported file type. Only JPG, PNG, WebP, GIF or AVIF images can be uploaded.");
  }

  // Cut off any data appended after the end of the image (polyglot payloads).
  const buffer = truncateToImageEnd(original, detected.mime);
  if (!buffer) {
    throw new ApiError(422, "That image file appears to be corrupt or truncated.");
  }

  // Reject decompression bombs before anything decodes the pixels.
  const dims = readImageDimensions(buffer, detected.mime);
  if (dims.width !== null && dims.height !== null) {
    const pixels = dims.width * dims.height;
    if (
      dims.width > LIMITS.maxImageDimension ||
      dims.height > LIMITS.maxImageDimension ||
      pixels > LIMITS.maxImagePixels
    ) {
      throw new ApiError(413, "That image's dimensions are too large.");
    }
    if (dims.width <= 0 || dims.height <= 0) {
      throw new ApiError(422, "That image has invalid dimensions.");
    }
  }

  const mime = detected.mime;
  // Server-controlled name: never derived from the uploaded filename, so no
  // path separators, no unicode tricks, no extension that executes as code.
  const filename = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}.${detected.ext}`;

  if (remoteStorageEnabled()) {
    const publicUrl = await uploadToSupabase(filename, buffer, mime);
    if (publicUrl) {
      return {
        filename,
        url: publicUrl,
        mimeType: mime,
        sizeBytes: file.size,
        width: dims.width,
        height: dims.height,
        relativePath: filename,
      };
    }
  }

  await ensureRoot();
  const absolute = path.join(UPLOAD_ROOT, filename);
  await fs.writeFile(absolute, buffer);

  return {
    filename,
    url: `/api/media/file/${filename}`,
    mimeType: mime,
    sizeBytes: file.size,
    width: dims.width,
    height: dims.height,
    relativePath: filename,
  };
}

export async function deleteStoredFile(filename: string) {
  if (remoteStorageEnabled()) {
    const objectPath = `${new Date().getUTCFullYear()}/${path.basename(filename)}`;
    await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${objectPath}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
    }).catch(() => undefined);
  }
  const safe = path.basename(filename);
  try {
    await fs.unlink(path.join(UPLOAD_ROOT, safe));
  } catch {
    /* already gone */
  }
}

export function resolveUploadPath(segments: string[]): string | null {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  const parts = segments.map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  // Only plain filenames — no separators, no traversal segments, no dotfiles.
  const valid = parts.every(
    (part) =>
      part.length <= 255 &&
      /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(part) &&
      part !== "." &&
      part !== "..",
  );
  if (!valid) return null;

  const root = path.resolve(UPLOAD_ROOT);
  const resolved = path.resolve(root, ...parts);

  /*
   * Boundary check via path.relative rather than a string prefix.
   *
   * `resolved.startsWith(root)` wrongly accepts a sibling directory that
   * merely shares the prefix (e.g. /app/uploads-backup when root is
   * /app/uploads). path.relative returns "" for the directory itself and a
   * path starting with ".." for anything that escapes it.
   */
  const relative = path.relative(root, resolved);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return resolved;
}

/**
 * Extension → MIME map used when serving a stored file. Images are the only
 * accepted upload type — video was retired so storage stays inside the free
 * tier — so no video extensions are mapped here.
 */
export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
};
