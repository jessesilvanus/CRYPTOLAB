import { NAV_GROUPS, NAV_ITEMS } from '@/data/modules'
import { NavItem } from '../navigation/NavItem'
import { cn } from '@/utils/cn'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

/**
 * Laboratory navigation panel.
 * Groups controls by discipline (overview / cryptography / communication).
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Laboratory navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--c-border)]',
          'bg-[rgba(8,10,16,0.72)] backdrop-blur-xl transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-[var(--c-border)] px-5">
          <span className="mono-label text-[0.7rem] font-semibold text-[rgb(var(--c-core))]">
            CRYPTOLAB // NAV
          </span>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="mono-label mb-2 px-3 !text-[0.55rem] !tracking-[0.24em] text-[var(--c-text-faint)]">
                {group.label}
              </p>
              <div className="space-y-1">
                {NAV_ITEMS.filter((i) => i.group === group.id).map((item) => (
                  <NavItem key={item.id} item={item} onNavigate={onClose} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--c-border)] px-5 py-4">
          <p className="mono-label !text-[0.55rem] text-[var(--c-text-faint)]">
            STEP 01 · FOUNDATION
          </p>
        </div>
      </aside>
    </>
  )
}
