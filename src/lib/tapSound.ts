let audioCtx: AudioContext | null = null

/** Soft glassy tap — requires a prior user gesture for AudioContext.resume(). */
export async function playSoftTapSound(): Promise<void> {
  try {
    const AudioContextApi =
      typeof window !== 'undefined'
        ? window.AudioContext ?? (window as typeof window & { webkitAudioContext?: AudioContext }).webkitAudioContext
        : undefined
    if (!AudioContextApi) return

    audioCtx ??= new AudioContextApi()
    if (audioCtx.state === 'suspended') await audioCtx.resume()

    const t0 = audioCtx.currentTime
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, t0)

    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(0.055, t0 + 0.018)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14)

    osc.connect(gain)
    gain.connect(audioCtx.destination)

    osc.start(t0)
    osc.stop(t0 + 0.15)
  } catch {
    /* ignore */
  }
}
