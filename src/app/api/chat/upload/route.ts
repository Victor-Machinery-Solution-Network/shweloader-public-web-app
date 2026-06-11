import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth/session";
import { enforceOrigin } from "@/lib/auth/csrf";
import { API_BASE_URL } from "@/lib/env";

/**
 * Multipart upload proxy — forwards a `file` + `sessionId` form to the worker's
 * POST /chat/upload and returns a normalised { fileUrl, fileName, fileSize, fileType }.
 *
 * NOTE: authedFetch is JSON-only so we call fetch directly here. Content-Type
 * must NOT be set manually — the browser/fetch will add the correct multipart
 * boundary automatically when body is a FormData instance.
 */
export async function POST(req: Request) {
  const csrf = enforceOrigin(req);
  if (csrf) return csrf;

  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const form = await req.formData();

  const workerRes = await fetch(`${API_BASE_URL}/chat/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    // Forward the FormData as-is; fetch sets multipart/form-data + boundary automatically.
    body: form,
  });

  if (!workerRes.ok) {
    const status = workerRes.status >= 400 && workerRes.status < 600
      ? workerRes.status
      : 502;
    return NextResponse.json({ error: "Upload failed" }, { status });
  }

  const data = (await workerRes.json()) as {
    url: string;
    key: string;
    name: string;
    size: number;
    type: string;
  };

  return NextResponse.json({
    fileUrl: data.url,
    fileName: data.name,
    fileSize: data.size,
    fileType: data.type,
  });
}
