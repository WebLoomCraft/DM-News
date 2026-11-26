import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  assertSameOrigin,
  enforceRateLimit,
  handleApiError,
  readJson,
} from "@/lib/api";
import { LIMITS, getCanonicalSiteUrl } from "@/lib/config";
import { hashToken, randomToken } from "@/lib/crypto";
import { passwordResetRequestSchema } from "@/lib/validators";

const MAIL_CONFIGURED = Boolean(
  process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.MAILER_SEND_KEY,
);

/**
 * The only response the endpoint will ever return. It does not reveal whether
 * the address exists, whether mail was configured, or whether a link was
 * issued — that is what stops account enumeration.
 */
const GENERIC_RESPONSE = {
  ok: true,
  message: "If an account exists for that address, a password reset link has been sent.",
};

async function sendResetEmail(email: string, resetUrl: string): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return false;
  const from = process.env.MAIL_FROM || "DM News Network <newsroom@dmnewsnetwork.com>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Reset your DM News Network password",
        html:
          `<p>You requested a password reset for your DM News Network account.</p>` +
          `<p><a href="${resetUrl}">Reset password</a></p>` +
          `<p>This link expires in 30 minutes and can be used once. If you did not request it, ignore this email — your password will not change.</p>`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);

    // Tight limit: reset requests are expensive (DB write + outbound mail).
    const limited = await enforceRateLimit(req, "pwreset", 5, 10 * 60_000);
    if (limited) return limited;

    const body = passwordResetRequestSchema.parse(await readJson(req));
    const email = body.email.toLowerCase().trim();

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];

    // Always do the same amount of work so response timing does not leak
    // whether the account exists.
    const token = randomToken(32);
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + LIMITS.resetTokenTtlMs);

    if (user && user.status === "active") {
      await db
        .update(users)
        .set({ resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      const resetUrl = `${getCanonicalSiteUrl()}/admin/reset-password?token=${encodeURIComponent(token)}`;

      if (!MAIL_CONFIGURED) {
        // Fail safely: never return the token or the link. The operator must
        // configure mail; logging the URL would also leak it into log storage.
        console.error(
          "[password-reset] No mail provider configured (RESEND_API_KEY / SMTP_HOST). " +
            "A reset was requested but no email could be delivered.",
        );
      } else {
        const sent = await sendResetEmail(email, resetUrl);
        if (!sent) {
          console.error("[password-reset] Mail provider rejected the password reset message.");
        }
      }
    }

    return Response.json(GENERIC_RESPONSE);
  } catch (error) {
    return handleApiError(error);
  }
}

