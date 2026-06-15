import { Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Sparkles,
  FileText,
  CreditCard,
  BarChart3,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Briefcase,
  Tags,
  Bell,
  Truck,
  Boxes,
} from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { useNotifications } from "@/hooks/useNotifications"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

const adminNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Orders", icon: ShoppingCart, path: "/orders" },
  { label: "Customers", icon: Users, path: "/customers" },
  { label: "Staff", icon: Briefcase, path: "/staff" },
  { label: "Services", icon: Sparkles, path: "/services" },
  { label: "Invoices", icon: FileText, path: "/invoices" },
  { label: "Payments", icon: CreditCard, path: "/payments" },
  { label: "Reports", icon: BarChart3, path: "/reports" },
  { label: "Users", icon: UserCog, path: "/users" },
  { label: "Settings", icon: Settings, path: "/settings" },
  
]

const adminSecondaryItems = [
  
  { label: "Categories", icon: Tags, path: "/items-categories" },
  { label: "Pickup & Delivery", icon: Truck, path: "/pickup-delivery" },
  { label: "Inventory", icon: Boxes, path: "/inventory" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
]

const staffNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Orders", icon: ShoppingCart, path: "/orders" },
  { label: "Customers", icon: Users, path: "/customers" },
  { label: "Payments", icon: CreditCard, path: "/payments" },
  { label: "Settings", icon: Settings, path: "/settings" },
]

const clientNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Orders", icon: ShoppingCart, path: "/orders" },
  { label: "Invoices", icon: FileText, path: "/invoices" },
  { label: "Payments", icon: CreditCard, path: "/payments" },
  { label: "Settings", icon: Settings, path: "/settings" },
]

interface SidebarProps {
  isOpen: boolean
  collapsed: boolean
  onClose: () => void
  onToggleCollapse: () => void
}

export default function Sidebar({ isOpen, collapsed, onClose, onToggleCollapse }: SidebarProps) {
  const { user } = useAuth()
  const location = useLocation()
  const { unreadCount } = useNotifications({ autoFetch: true, limit: 20, refreshInterval: 30000 })

  const role = user?.role || "client"
  const primaryItems =
    role === "admin" ? adminNavItems : role === "staff" ? staffNavItems : clientNavItems
  const secondaryItems = role === "admin" ? adminSecondaryItems : []

  const isActivePath = (path: string) =>
    location.pathname === path || (path !== "/dashboard" && location.pathname.startsWith(`${path}/`))

  const renderNavItem = (item: (typeof adminNavItems)[0]) => {
    const Icon = item.icon
    const active = isActivePath(item.path)
    const showBadge = item.path === "/notifications" && unreadCount > 0

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onClose}
        className={cn(
          "group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-all duration-200",
          active
            ? "bg-sidebar-active text-white shadow-soft"
            : "text-white/70 hover:bg-sidebar-hover hover:text-white"
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", active ? "text-white" : "text-white/60 group-hover:text-white")} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {showBadge && (
              <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </>
        )}
      </Link>
    )
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-white transition-all duration-300 md:static md:translate-x-0",
          collapsed ? "w-[72px]" : "w-[260px]",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-white/10 px-4", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">LaundryHub</h2>
              <p className="text-[11px] font-medium uppercase tracking-widest text-white/50">Management</p>
            </div>
          )}
          {collapsed && (
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-sm font-bold">L</div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/70 hover:bg-sidebar-hover hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">{primaryItems.map(renderNavItem)}</nav>

          {secondaryItems.length > 0 && !collapsed && (
            <div className="mt-8">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-white/40">More</p>
              <nav className="space-y-1">{secondaryItems.map(renderNavItem)}</nav>
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-white/10 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3 rounded-[10px] bg-sidebar-hover p-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-xs">{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user?.name || "User"}</p>
                <p className="truncate text-xs font-medium capitalize text-white/50">{user?.role || "guest"}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-xs">{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="mt-2 hidden w-full text-white/60 hover:bg-sidebar-hover hover:text-white md:flex"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span className="ml-2">Collapse</span></>}
          </Button>
        </div>
      </aside>
    </>
  )
}
