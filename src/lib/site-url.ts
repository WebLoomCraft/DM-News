import { headers } from "next/headers";
import { getSettings } from "./settings";

export async function getBaseUrl(): Promise<string> {
  const settings = await getSettings();
  const configured = (settings.siteUrl || "").trim();
  try {
    const list = await headers();
    const host = list.get("host");
    const proto = list.get("x-forwarded-proto") || "http";
    if (host && (!configured || configured.includes("localhost") || configured.includes("127.0.0.1"))) {
      return `${proto}://${host}`;
    }
  } catch {
    /* headers() is unavailable outside a request scope */
  }
  return configured || "http://localhost:3000";
}
