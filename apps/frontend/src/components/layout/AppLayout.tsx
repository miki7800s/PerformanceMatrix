import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BackgroundScene } from './BackgroundScene'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Skeleton } from '@/components/ui/skeleton'

function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  )
}

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <BackgroundScene />
      <Sidebar />
      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="container max-w-7xl py-6 lg:py-8">
          <Breadcrumbs />
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
