// HiveConnect honeycomb mark (from HiveConnect_Mark_*.svg in the provided logo pack).
//
// The source artwork is stroke-based and sized for large usage. For UI chrome
// (24px sidebar mark; 34px hero mark) we render it as a crisp, theme-aware
// outline by inheriting `currentColor`.
//
// Geometry: original viewBox 0 0 240 240; cropped to the mark bounds so it
// fills small icon sizes more effectively.

import type { IconProps } from './icons/props.ts'

/**
 * Render the product mark.
 * @param props.size - square edge in px (default 24).
 * @param props.className - extra class for layout placement.
 * @returns the logo svg (aria-hidden; decorative brand mark).
 */
export function FishLogo({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="18 31.665 204 176.67"
      fill="none"
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      >
        <polygon points="154 120 137 149.445 103 149.445 86 120 103 90.555 137 90.555" />
        <polygon points="222 120 205 149.445 171 149.445 154 120 171 90.555 205 90.555" />
        <polygon points="188 178.89 171 208.335 137 208.335 120 178.89 137 149.445 171 149.445" />
        <polygon points="120 178.89 103 208.335 69 208.335 52 178.89 69 149.445 103 149.445" />
        <polygon points="86 120 69 149.445 35 149.445 18 120 35 90.555 69 90.555" />
        <polygon points="120 61.11 103 90.555 69 90.555 52 61.11 69 31.665 103 31.665" />
        <polygon points="188 61.11 171 90.555 137 90.555 120 61.11 137 31.665 171 31.665" />
      </g>
    </svg>
  )
}
