import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ApiError } from "./api";

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

const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 48 * 1024 * 1024;

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "media";

/** True when uploads should be persisted to Supabase Storage. */
export function remoteStorageEnabled(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function safeExt(name: string, mime: string): string {
  const fromMime = IMAGE_TYPES[mime] || VIDEO_TYPES[mime];
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
  const mime = (file.type || "").toLowerCase();
  const isImage = Boolean(IMAGE_TYPES[mime]);
  const isVideo = Boolean(VIDEO_TYPES[mime]);
  if (!isImage && !isVideo) {
    throw new ApiError(415, "Unsupported file type. Upload JPG, PNG, WebP, GIF or AVIF images (MP4/WebM for short clips).");
  }
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    throw new ApiError(413, `File is too large. Maximum ${Math.round(limit / (1024 * 1024))}MB for ${isVideo ? "video" : "images"}.`);
  }
  if (file.size === 0) throw new ApiError(422, "The uploaded file is empty");

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = safeExt(file.name, mime);
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const dims = isImage ? readImageDimensions(buffer, mime) : { width: null, height: null };

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
  const clean = segments
    .map((s) => s.trim())
    .filter(Boolean)
    .every((s) => /^[a-zA-Z0-9._-]+$/.test(s));
  if (!clean) return null;
  const absolute = path.join(UPLOAD_ROOT, ...segments.map((s) => path.basename(s)));
  const resolved = path.resolve(absolute);
  if (!resolved.startsWith(path.resolve(UPLOAD_ROOT))) return null;
  return resolved;
}

export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};
