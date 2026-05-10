/** Short, subtle tap feedback (mobile / supported desktops). */
export function vibrateTap(): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate(16)
  } catch {
    /* ignore */
  }
}
