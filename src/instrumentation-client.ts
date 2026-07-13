const recoveryKey = "direct_chunk_recovery";
const chunkErrorPattern = /ChunkLoadError|Failed to load chunk|_next\/static\/(?:chunks|media)/i;

function recoverFromStaleChunk(value: unknown) {
  const detail = value as { message?: string; stack?: string } | null;
  const message = typeof value === "string" ? value : detail?.message || detail?.stack || "";
  if (!chunkErrorPattern.test(message)) return;

  try {
    const lastRecovery = Number(sessionStorage.getItem(recoveryKey) || 0);
    if (Date.now() - lastRecovery < 30_000) return;
    sessionStorage.setItem(recoveryKey, String(Date.now()));
  } catch {
    // Reloading still gives the browser a chance to fetch the current build.
  }

  window.location.reload();
}

window.addEventListener(
  "error",
  (event) => {
    const target = event.target as (EventTarget & { src?: string; href?: string }) | null;
    recoverFromStaleChunk(target?.src || target?.href || event.message || event.error);
  },
  true
);

window.addEventListener("unhandledrejection", (event) => recoverFromStaleChunk(event.reason));
