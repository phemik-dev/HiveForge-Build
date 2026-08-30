import type { HeroBrandMarkOwnerProps } from '@hiveforge-ai/dsh-client-ui-conversation/client'
import type { SidebarBrandMarkOwnerProps } from '@hiveforge-ai/dsh-client-ui-sidebar/client'
import { FishLogo } from '@hiveforge-ai/dsh-client-ui-primitives'

type OfficialBrandMarkProps = HeroBrandMarkOwnerProps & SidebarBrandMarkOwnerProps

/**
 * Render the official product mark with the presentation requested by its host surface.
 * @param props - Host-supplied mark presentation.
 * @returns the mark svg.
 */
export function OfficialBrandMark({ size, className }: OfficialBrandMarkProps) {
  return <FishLogo size={size} className={className} />
}

/**
 * Render the official product name; the approved mark occupies its own slot.
 * @returns the HiveForge name label.
 */
export function OfficialBrandName() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
      <span style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>HiveForge</span>
      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.62 }}>
        Provisional
      </span>
    </span>
  )
}
