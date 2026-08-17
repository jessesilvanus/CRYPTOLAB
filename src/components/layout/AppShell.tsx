import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { SystemBar } from './SystemBar'
import { Sidebar } from './Sidebar'
import { RouteTransition } from '../navigation/RouteTransition'

/**
 * The laboratory frame — top bar + navigation + scrollable workspace.
 * Every lab page renders into <Outlet/> with a shared route transition.
 */
export function AppShell() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <SystemBar onToggleNav={() => setNavOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

        <main className="relative flex-1 overflow-y-auto lg:pl-64">
          <div className="tech-grid pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden="true" />
          <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
            <RouteTransition>
              <Outlet />
            </RouteTransition>
          </div>
        </main>
      </div>
    </div>
  )
}
