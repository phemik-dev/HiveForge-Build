/** `plan` namespace dictionaries (the composer plan chip's copy). */

/** English dictionary (the key-set source of truth). */
export const en = {
  'chip.on.aria': 'Plan mode on, press to turn off',
  'chip.on.title': 'Plan mode on — click to turn off (/plan off)',
  'chip.off.aria': 'Plan mode off, press to turn on',
  'chip.off.title': 'Plan mode off — click to turn on (/plan)',
} satisfies Record<string, string>

/** The plan namespace key union. */
export type PlanKey = keyof typeof en

/** Simplified Chinese dictionary, checked complete against the en key set. */
export const zh: Record<PlanKey, string> = {
  'chip.on.aria': 'plan mode 已开启，按下关闭',
  'chip.on.title': 'plan mode 已开启 — 点击关闭（/plan off）',
  'chip.off.aria': 'plan mode 已关闭，按下开启',
  'chip.off.title': 'plan mode 已关闭 — 点击开启（/plan）',
}
