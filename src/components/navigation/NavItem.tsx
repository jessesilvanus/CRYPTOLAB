import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { NavItem as NavItemType } from '@/data/modules'
import { cn } from '@/utils/cn'

interface NavItemProps {
  item: NavItemType
  onNavigate?: () => void
}

/**
 * A single laboratory navigation control.
 * Active state is a left rail + brighter text + filled icon — feels like a
 * module being selected on an instrument, not an admin menu.
 */
export function NavItem({ item, onNavigate }: NavItemProps) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      end={item.id === 'home'}
      className={({ isActive }) =>
        cn(
          'group relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--c-core))]',
          isActive
            ? 'text-[var(--c-text)]'
            : 'text-[var(--c-text-dim)] hover:text-[var(--c-text)] hover:bg-[rgba(255,255,255,0.03)]',
        )
      }
      title={item.tagline}
    >
      {({ isActive }) => (
        <>
          {/* Active rail — centered by the flex wrapper, so the layoutId element
              carries no CSS transform that framer-motion's projection would fight. */}
          {isActive && (
            <span className="absolute inset-y-0 left-0 flex items-center">
              <motion.span
                layoutId="nav-rail"
                className="h-6 w-[3px] rounded-full bg-[rgb(var(--c-core))] shadow-[0_0_10px_rgba(94,234,212,0.6)]"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            </span>
          )}
          <Icon
            size={17}
            strokeWidth={isActive ? 2.2 : 1.7}
            className={cn(
              'shrink-0 transition-colors',
              isActive ? 'text-[rgb(var(--c-core))]' : 'text-[var(--c-text-faint)] group-hover:text-[var(--c-text-dim)]',
            )}
          />
          <span className="mono-label !tracking-[0.16em]">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}
