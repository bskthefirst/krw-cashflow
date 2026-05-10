const STORAGE_KEY = 'krw-cashflow-interaction-v1'

export type InteractionPrefs = {
  /** Short vibration when tapping a chart bar */
  haptics: boolean
  /** Soft click sound when tapping a chart bar */
  sound: boolean
}

const defaults: InteractionPrefs = {
  haptics: true,
  sound: false,
}

export function getInteractionPrefs(): InteractionPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaults }
    const p = JSON.parse(raw) as Partial<InteractionPrefs>
    return {
      haptics: typeof p.haptics === 'boolean' ? p.haptics : defaults.haptics,
      sound: typeof p.sound === 'boolean' ? p.sound : defaults.sound,
    }
  } catch {
    return { ...defaults }
  }
}

export function setInteractionPrefs(patch: Partial<InteractionPrefs>): InteractionPrefs {
  const next = { ...getInteractionPrefs(), ...patch }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}
