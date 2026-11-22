import fs from "node:fs/promises";
import path from "node:path";
import { resolveUploadPath, MIME_BY_EXT } from "@/lib/media-storage";

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { path: segments } = await ctx.params;
  const resolved = resolveUploadPath(segments);
  if (!resolved) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const buffer = await fs.readFile(resolved);
    const ext = path.extname(resolved).slice(1).toLowerCase();
    const type = MIME_BY_EXT[ext] || "application/octet-stream";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
