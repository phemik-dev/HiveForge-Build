/**
 * The common-namespace dictionary pair. en is the source of truth for the
 * key set; zh is checked complete against it — a missing or extra zh key is a
 * compile error.
 */
export { en } from './en.ts'
export { zh } from './zh.ts'
export type { CommonKey } from './en.ts'
