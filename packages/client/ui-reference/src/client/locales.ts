/** `reference` namespace dictionaries for the unified `@` source. */

import type {} from '@hiveforge-ai/dsh-client-ui-slots'

/** Dictionary namespace owned by this plugin. */
export const NS = 'reference'

/** English dictionary (the key-set source of truth). */
export const en = {
  'section.files': 'Files & folders',
  'section.sessions': 'Session conversations',
  'candidate.file': 'File',
  'candidate.folder': 'Folder',
  'candidate.session': 'Session',
  'candidate.noCwd': '(no cwd)',
} satisfies Record<string, string>

/** The reference namespace key union. */
export type ReferenceKey = keyof typeof en

declare module '@hiveforge-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The unified `@` reference menu's copy. */
    reference: ReferenceKey
  }
}

/** Simplified Chinese dictionary, checked complete against the English key set. */
export const zh = {
  'section.files': '文件与文件夹',
  'section.sessions': 'Session 对话',
  'candidate.file': '文件',
  'candidate.folder': '文件夹',
  'candidate.session': 'Session',
  'candidate.noCwd': '（无工作目录）',
} satisfies Record<ReferenceKey, string>
