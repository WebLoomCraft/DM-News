"use client";

export class ApiClientError extends Error {
  status: number;
  details: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type Options = Omit<RequestInit, "body"> & {
  json?: unknown;
  body?: BodyInit | null;
  query?: Record<string, string | number | undefined | null>;
};

export async function api<T = unknown>(path: string, options: Options = {}): Promise<T> {
  const { json, query, headers, body, ...rest } = options;
  let url = path;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      params.set(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : body,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const payload = data as { error?: string; message?: string; details?: unknown } | null;
    const message = payload?.error || payload?.message || `Request failed (${res.status})`;
    throw new ApiClientError(message, res.status, payload?.details);
  }
  return data as T;
}

export async function uploadFile(file: File, alt?: string): Promise<{ item: { id: number; url: string; filename: string; originalName: string; mimeType: string; sizeBytes: number; width: number | null; height: number | null; alt: string | null; createdAt: string } }> {
  const form = new FormData();
  form.append("file", file);
  if (alt) form.append("alt", alt);
  const res = await fetch("/api/media", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new ApiClientError(data?.error || "Upload failed", res.status);
  return data;
}
