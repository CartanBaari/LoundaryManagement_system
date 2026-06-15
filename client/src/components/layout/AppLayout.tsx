import { useState, type ReactNode } from "react"
import { motion } from "framer-motion"
import Sidebar from "./Sidebar"
import Navbar from "./Navbar"
import { Skeleton } from "@/components/ui/skeleton"

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export function PageLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-[16px]" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-[16px]" />
    </div>
  )
}

export function AuthLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] bg-primary">
          <span className="text-lg font-bold text-white">L</span>
        </div>
        <div className="space-y-2">
          <Skeleton className="mx-auto h-4 w-32" />
          <Skeleton className="mx-auto h-3 w-24" />
        </div>
      </div>
    </div>
  )
}
