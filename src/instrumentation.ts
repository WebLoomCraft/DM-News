export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { runSeedSafely } = await import("@/lib/seed");
  await runSeedSafely();
}
