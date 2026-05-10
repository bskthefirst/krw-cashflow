import { getInteractionPrefs } from './interactionPrefs'
import { vibrateTap } from './haptics'
import { playSoftTapSound } from './tapSound'

/** Same timing as chart bars — slow “juicy” rubberBand from Animate.css */
export const TAP_POP_DURATION = '2.35s'

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Haptics + optional tap sound (respects Assets → interaction prefs). */
export function triggerTapPopFeedback(): void {
  if (prefersReducedMotion()) return
  const prefs = getInteractionPrefs()
  if (prefs.haptics) vibrateTap()
  if (prefs.sound) void playSoftTapSound()
}
