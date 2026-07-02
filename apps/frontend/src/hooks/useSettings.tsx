import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_THRESHOLDS,
  setActiveThresholds,
  type KpiThresholds,
} from '@/utils/format'

/**
 * User preferences, persisted in localStorage only — nothing leaves
 * the machine.
 */
export interface AppSettings {
  /** Period pre-selected on startup ('' = newest imported). */
  defaultPeriod: string
  /** Manager pre-selected in table filters ('' = all). */
  defaultManager: string
  /** Default rows per page in tables. */
  pageSize: number
  /** Color boundaries for percent KPIs. */
  thresholds: KpiThresholds
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultPeriod: '',
  defaultManager: '',
  pageSize: 20,
  thresholds: DEFAULT_THRESHOLDS,
}

const STORAGE_KEY = 'care-dashboard-settings'

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      thresholds: { ...DEFAULT_THRESHOLDS, ...parsed.thresholds },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

interface SettingsContextValue {
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    // Keep the module-level thresholds in sync so pure helpers
    // (formatters, chart tone functions) use the configured bounds.
    setActiveThresholds(settings.thresholds)
  }, [settings])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...patch,
      thresholds: { ...prev.thresholds, ...patch.thresholds },
    }))
  }, [])

  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings }),
    [settings, updateSettings, resetSettings],
  )

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
