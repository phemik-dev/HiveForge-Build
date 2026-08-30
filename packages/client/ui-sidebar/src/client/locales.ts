/** `sidebar` namespace dictionaries: shell controls (brand row, New Session, fold toggle). */

/** English dictionary (the key-set source of truth). */
export const en = {
  'session.new': 'New Session',
  'session.new.label': 'New session',
  'toggle.open': 'Open sidebar',
  'toggle.collapse': 'Collapse sidebar',
} satisfies Record<string, string>

/** The sidebar namespace key union. */
export type SidebarKey = keyof typeof en

/** Simplified Chinese dictionary, checked complete against the English key set. */
export const zh = {
  'session.new': '新会话',
  'session.new.label': '新建会话',
  'toggle.open': '打开侧边栏',
  'toggle.collapse': '收起侧边栏',
} satisfies Record<SidebarKey, string>
