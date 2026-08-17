import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CoreStateProvider } from '@/hooks/useCoreState'
import { AppShell } from '@/components/layout/AppShell'

// Lazy-load pages so the heavy 3D landing only loads when needed.
// Pages use named exports, so we map the default here.
const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const EncryptionLab = lazy(() =>
  import('@/pages/EncryptionLab').then((m) => ({ default: m.EncryptionLab })),
)
const DecryptionLab = lazy(() =>
  import('@/pages/DecryptionLab').then((m) => ({ default: m.DecryptionLab })),
)
const CipherLab = lazy(() => import('@/pages/CipherLab').then((m) => ({ default: m.CipherLab })))
const PipelineLab = lazy(() =>
  import('@/pages/PipelineLab').then((m) => ({ default: m.PipelineLab })),
)
const NetworkLab = lazy(() =>
  import('@/pages/NetworkLab').then((m) => ({ default: m.NetworkLab })),
)
const AttackLab = lazy(() => import('@/pages/AttackLab').then((m) => ({ default: m.AttackLab })))
const LearnPage = lazy(() => import('@/pages/LearnPage').then((m) => ({ default: m.LearnPage })))
const EvolutionLab = lazy(() =>
  import('@/pages/EvolutionLab').then((m) => ({ default: m.EvolutionLab })),
)
const DesLab = lazy(() => import('@/pages/DesLab').then((m) => ({ default: m.DesLab })))
const AesLab = lazy(() => import('@/pages/AesLab').then((m) => ({ default: m.AesLab })))

function LoadingScreen() {
  return (
    <div className="grid h-screen w-screen place-items-center bg-[var(--c-bg)]">
      <span className="mono-label animate-pulse text-[rgb(var(--c-core))]">
        INITIALIZING LABORATORY…
      </span>
    </div>
  )
}

/**
 * CRYPTOLAB root.
 * `/` is the cinematic landing page (no shell). Every lab page lives inside
 * the laboratory shell. CoreStateProvider lets any module drive the 3D core.
 */
export default function App() {
  return (
    <BrowserRouter>
      <CoreStateProvider>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route element={<AppShell />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/encrypt" element={<EncryptionLab />} />
              <Route path="/decrypt" element={<DecryptionLab />} />
              <Route path="/ciphers" element={<CipherLab />} />
              <Route path="/pipeline" element={<PipelineLab />} />
              <Route path="/network" element={<NetworkLab />} />
              <Route path="/attack" element={<AttackLab />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/evolution" element={<EvolutionLab />} />
              <Route path="/des" element={<DesLab />} />
              <Route path="/aes" element={<AesLab />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </CoreStateProvider>
    </BrowserRouter>
  )
}
