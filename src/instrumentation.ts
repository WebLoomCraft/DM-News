/**
 * Runs once when the server boots.
 *
 * Security configuration is validated here so a deployment with a missing
 * AUTH_SECRET, a non-HTTPS canonical URL, or disabled database TLS fails at
 * startup with an explicit message — instead of silently running with a
 * predictable key and only being discovered after a compromise.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { validateStartupConfig, ConfigError } = await import("@/lib/config");
  const { warnIfRateLimitIsLocalOnly } = await import("@/lib/rate-limit");

  try {
    validateStartupConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error("\n================ SECURITY CONFIGURATION ERROR ================");
      console.error(error.message);
      console.error("=============================================================\n");
      // Refuse to serve traffic with an insecure configuration.
      throw error;
    }
    throw error;
  }

  warnIfRateLimitIsLocalOnly();

  const { runSeedSafely } = await import("@/lib/seed");
  await runSeedSafely();
}
