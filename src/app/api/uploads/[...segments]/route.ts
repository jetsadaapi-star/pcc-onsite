import { readFile } from "node:fs/promises";
import path from "node:path";
import { get } from "@vercel/blob";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ segments: string[] }> }
) {
  const { segments } = await context.params;
  if (!segments.length || segments.some((segment) => !/^[a-zA-Z0-9._-]+$/.test(segment))) {
    return new Response("Not found", { status: 404 });
  }

  const isBranding = segments[0] === "branding";
  if (!isBranding) await requireUser();

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const result = await get(`uploads/${segments.join("/")}`, { access: "private" });
      if (!result || result.statusCode !== 200) return new Response("Not found", { status: 404 });

      return new Response(result.stream, {
        headers: {
          "Content-Type": result.blob.contentType,
          "Content-Length": String(result.blob.size),
          "Cache-Control": isBranding ? "public, max-age=3600, stale-while-revalidate=86400" : "private, max-age=300",
          ETag: result.blob.etag,
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox"
        }
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  const storageRoot = process.env.UPLOAD_STORAGE_DIR
    ? path.resolve(process.env.UPLOAD_STORAGE_DIR)
    : path.join(process.cwd(), "storage", "uploads");
  const filePath = path.resolve(storageRoot, ...segments);
  if (!filePath.startsWith(`${path.resolve(storageRoot)}${path.sep}`)) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = contentTypes[path.extname(filePath).toLowerCase()];
  if (!contentType) return new Response("Not found", { status: 404 });

  try {
    const file = await readFile(filePath);
    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox"
      }
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
