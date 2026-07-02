import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ThemeProvider, useTheme } from '@/hooks/useTheme'
import { SettingsProvider } from '@/hooks/useSettings'
import { ReportDataProvider } from '@/hooks/useReportData'
import { KeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { WatchlistProvider } from '@/hooks/useWatchlist'
import { OperatorDrawerProvider } from '@/components/OperatorDrawer'
import { CommandPalette } from '@/components/CommandPalette'
import { AppLayout } from '@/components/layout/AppLayout'

// Pages are lazy-loaded so the initial bundle stays small.
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const OperatorsPage = lazy(() =>
  import('@/pages/OperatorsPage').then((m) => ({ default: m.OperatorsPage })),
)
const OperatorDetailPage = lazy(() =>
  import('@/pages/OperatorDetailPage').then((m) => ({
    default: m.OperatorDetailPage,
  })),
)
const ManagersPage = lazy(() =>
  import('@/pages/ManagersPage').then((m) => ({ default: m.ManagersPage })),
)
const ManagerDetailPage = lazy(() =>
  import('@/pages/ManagerDetailPage').then((m) => ({
    default: m.ManagerDetailPage,
  })),
)
const ImportPage = lazy(() =>
  import('@/pages/ImportPage').then((m) => ({ default: m.ImportPage })),
)
const HistoryPage = lazy(() =>
  import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })),
)
const ComparePage = lazy(() =>
  import('@/pages/ComparePage').then((m) => ({ default: m.ComparePage })),
)
const RankingPage = lazy(() =>
  import('@/pages/RankingPage').then((m) => ({ default: m.RankingPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const MatrixPage = lazy(() =>
  import('@/pages/MatrixPage').then((m) => ({ default: m.MatrixPage })),
)
const HeatmapPage = lazy(() =>
  import('@/pages/HeatmapPage').then((m) => ({ default: m.HeatmapPage })),
)
const SummaryPage = lazy(() =>
  import('@/pages/SummaryPage').then((m) => ({ default: m.SummaryPage })),
)

function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster richColors position="top-right" theme={theme} />
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <ReportDataProvider>
          <HashRouter>
            <WatchlistProvider>
              <OperatorDrawerProvider>
              <Suspense fallback={null}>
                <Routes>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="operators" element={<OperatorsPage />} />
                  <Route
                    path="operators/:name"
                    element={<OperatorDetailPage />}
                  />
                  <Route path="managers" element={<ManagersPage />} />
                  <Route
                    path="managers/:name"
                    element={<ManagerDetailPage />}
                  />
                  <Route path="import" element={<ImportPage />} />
                  <Route path="history" element={<HistoryPage />} />
                  <Route path="compare" element={<ComparePage />} />
                  <Route path="ranking" element={<RankingPage />} />
                  <Route path="matrix" element={<MatrixPage />} />
                  <Route path="heatmap" element={<HeatmapPage />} />
                  <Route path="summary" element={<SummaryPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                </Routes>
              </Suspense>
                <KeyboardShortcuts />
                <CommandPalette />
              </OperatorDrawerProvider>
            </WatchlistProvider>
            <ThemedToaster />
          </HashRouter>
        </ReportDataProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
