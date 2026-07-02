import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'care-dashboard-watchlist'

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : []
  } catch {
    return []
  }
}

interface WatchlistContextValue {
  watchlist: string[]
  isWatched: (fullName: string) => boolean
  toggleWatch: (fullName: string) => void
}

const WatchlistContext = createContext<WatchlistContextValue>({
  watchlist: [],
  isWatched: () => false,
  toggleWatch: () => {},
})

/**
 * Coaching watchlist — operators the Team Leader pinned with a star.
 * Persisted in localStorage; surfaced on Mission Control.
 */
export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<string[]>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist))
  }, [watchlist])

  const isWatched = useCallback(
    (fullName: string) => watchlist.includes(fullName),
    [watchlist],
  )

  const toggleWatch = useCallback((fullName: string) => {
    setWatchlist((prev) =>
      prev.includes(fullName)
        ? prev.filter((name) => name !== fullName)
        : [...prev, fullName],
    )
  }, [])

  const value = useMemo(
    () => ({ watchlist, isWatched, toggleWatch }),
    [watchlist, isWatched, toggleWatch],
  )

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  )
}

export function useWatchlist() {
  return useContext(WatchlistContext)
}
