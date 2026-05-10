import { useId, useState } from 'react'
import {
  getInteractionPrefs,
  setInteractionPrefs,
  type InteractionPrefs,
} from '../lib/interactionPrefs'

export function InteractionSettings() {
  const baseId = useId()
  const [prefs, setPrefs] = useState<InteractionPrefs>(() =>
    getInteractionPrefs(),
  )

  function patch(next: Partial<InteractionPrefs>) {
    const merged = setInteractionPrefs(next)
    setPrefs(merged)
  }

  return (
    <section
      className="interaction-settings animate__animated animate__fadeInUp animate__faster"
      aria-labelledby={`${baseId}-heading`}
    >
      <h2 id={`${baseId}-heading`} className="interaction-settings__title">
        차트 막대 피드백
      </h2>
      <p className="interaction-settings__hint">
        막대 탭 애니메이션과 함께 선택한 피드백을 줍니다 (Animate.css + 선택 기능).
      </p>

      <label className="interaction-settings__row">
        <span className="interaction-settings__label">짧은 진동</span>
        <input
          type="checkbox"
          className="interaction-settings__checkbox"
          checked={prefs.haptics}
          onChange={(e) => patch({ haptics: e.target.checked })}
        />
      </label>

      <label className="interaction-settings__row">
        <span className="interaction-settings__label">부드러운 탭 소리</span>
        <input
          type="checkbox"
          className="interaction-settings__checkbox"
          checked={prefs.sound}
          onChange={(e) => patch({ sound: e.target.checked })}
        />
      </label>
    </section>
  )
}
