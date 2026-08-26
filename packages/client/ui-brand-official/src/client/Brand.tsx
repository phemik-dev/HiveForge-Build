import type { HeroBrandMarkOwnerProps } from '@hiveforge-ai/dsh-client-ui-conversation/client'
import type { SidebarBrandMarkOwnerProps } from '@hiveforge-ai/dsh-client-ui-sidebar/client'

type OfficialBrandMarkProps = HeroBrandMarkOwnerProps & SidebarBrandMarkOwnerProps

/**
 * Render the HiveForge mark with the presentation requested by its host surface.
 * @param props - Host-supplied mark presentation.
 * @returns the HiveForge mark.
 */
export function OfficialBrandMark({ size, className }: OfficialBrandMarkProps) {
  const px = typeof size === 'number' ? `${size}px` : String(size)
  return (
    <div
      className={className}
      style={{
        width: px,
        height: px,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 8,
        fontWeight: 700,
        lineHeight: 1,
        userSelect: 'none',
        background: 'var(--dsw-color-primary-600, #2563eb)',
        color: 'white',
      }}
      aria-label="HiveForge"
      title="HiveForge"
    >
      HF
    </div>
  )
}

/**
 * Render the HiveForge name.
 * @returns the HiveForge name label.
 */
export function OfficialBrandName() {
  return (
    <span style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
      HiveForge
    </span>
  )
}
