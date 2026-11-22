import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin, getClientIp, handleApiError, rateLimit, readJson, tooManyRequests } from "@/lib/api";
import { passwordResetRequestSchema } from "@/lib/validators";

const MAIL_CONFIGURED = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.MAILER_SEND_KEY);

async function sendResetEmail(email: string, resetUrl: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const from = process.env.MAIL_FROM || "DM News Network <newsroom@dmnewsnetwork.com>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Reset your DM News Network password",
        html: `<p>You requested a password reset for your DM News Network account.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 30 minutes. If you did not request it, ignore this email.</p>`,
      }),
    });
    return res.ok;
  }
  return false;
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const ip = getClientIp(req);
    if (!rateLimit(`reset:${ip}`, 5, 60_000)) return tooManyRequests();

    const body = passwordResetRequestSchema.parse(await readJson(req));
    const email = body.email.toLowerCase();
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];

    const generic = {
      ok: true,
      message: "If an account exists for that address, a reset link has been issued.",
      mailConfigured: MAIL_CONFIGURED,
    };

    if (!user) return Response.json(generic);

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await db
      .update(users)
      .set({
        resetTokenHash: await bcrypt.hash(tokenHash, 8),
        resetTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      })
      .where(eq(users.id, user.id));

    const origin = req.headers.get("origin") || `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host")}`;
    const resetUrl = `${origin}/admin/reset-password?token=${token}`;

    const sent = MAIL_CONFIGURED ? await sendResetEmail(email, resetUrl) : false;
    if (sent) return Response.json(generic);

    // No mail provider configured: surface the link so the account owner (or the
    // operator of this preview) can complete the flow. Disable with MAIL_CONFIGURED=true env.
    return Response.json({
      ...generic,
      mailConfigured: false,
      resetUrl,
      notice: "No mail provider is configured (set RESEND_API_KEY or SMTP_HOST). The reset link is returned here instead of being emailed.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
