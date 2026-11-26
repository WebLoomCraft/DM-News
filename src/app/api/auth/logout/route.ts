import { assertSameOrigin, handleApiError } from "@/lib/api";
import { clearSessionCookie, getSessionUserId, revokeUserSessions } from "@/lib/session";

/**
 * Sign out.
 *
 * Clearing the cookie alone leaves a valid bearer token in existence — anyone
 * who captured it could keep using it until expiry. Logout therefore also
 * bumps the user's session version, which revokes every token issued before
 * this request, not just the one in this browser.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const userId = await getSessionUserId();
    if (userId) {
      await revokeUserSessions(userId);
    }
    await clearSessionCookie();
    return Response.json({ ok: true });
  } catch (error) {
    // Even if revocation fails, the cookie must not survive.
    await clearSessionCookie().catch(() => undefined);
    return handleApiError(error);
  }
}
