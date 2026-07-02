import * as React from 'react'
import { cn } from '@/utils/cn'

interface TabsContextValue {
  value: string
  setValue: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
}

function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  children,
  ...props
}: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue)
  const value = controlled ?? internal
  const setValue = React.useCallback(
    (next: string) => {
      setInternal(next)
      onValueChange?.(next)
    },
    [onValueChange],
  )
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div {...props}>{children}</div>
    </TabsContext.Provider>
  )
}

function useTabs() {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error('Tabs components must be used within <Tabs>')
  return context
}

function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const { value: active, setValue } = useTabs()
  const isActive = active === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-card text-foreground shadow-sm'
          : 'hover:text-foreground',
        className,
      )}
      onClick={() => setValue(value)}
      {...props}
    />
  )
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

function TabsContent({ value, className, ...props }: TabsContentProps) {
  const { value: active } = useTabs()
  if (active !== value) return null
  return (
    <div role="tabpanel" className={cn('mt-4', className)} {...props} />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
