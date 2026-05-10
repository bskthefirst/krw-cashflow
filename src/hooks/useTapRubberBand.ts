import type { CSSProperties } from 'react'
import { useCallback, useState } from 'react'
import { TAP_POP_DURATION, triggerTapPopFeedback } from '../lib/tapPopFeedback'

/**
 * Tap → rubberBand + shared feedback. Inner layer should own `onAnimationEnd`.
 */
export function useTapRubberBand() {
  const [isPopping, setIsPopping] = useState(false)

  const trigger = useCallback(() => {
    triggerTapPopFeedback()
    setIsPopping(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsPopping(true))
    })
  }, [])

  const onPopEnd = useCallback(() => {
    setIsPopping(false)
  }, [])

  const tapOverlayClass = isPopping
    ? 'animate__animated animate__rubberBand'
    : ''

  const tapOverlayStyle: CSSProperties | undefined = isPopping
    ? ({ '--animate-duration': TAP_POP_DURATION } as CSSProperties)
    : undefined

  return {
    trigger,
    onPopEnd,
    tapOverlayClass,
    tapOverlayStyle,
  }
}
