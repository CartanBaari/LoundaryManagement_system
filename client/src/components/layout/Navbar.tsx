import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Menu,
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  Settings,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useNotifications } from "@/hooks/useNotifications"
import { useTheme } from "@/components/theme-provider"
import { getInitials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/orders": "Orders",
  "/customers": "Customers",
  "/services": "Services",
  "/invoices": "Invoices",
  "/payments": "Payments",
  "/reports": "Reports",
  "/users": "Users",
  "/staff": "Staff Management",
  "/settings": "Settings",
  "/items-categories": "Categories",
  "/pickup-delivery": "Pickup & Delivery",
  "/inventory": "Inventory",
  "/notifications": "Notifications",
}

const roleBadgeVariant: Record<string, "destructive" | "info" | "success"> = {
  admin: "destructive",
  staff: "info",
  client: "success",
}

interface NavbarProps {
  onMenuToggle: () => void
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications({ autoFetch: true, limit: 20, refreshInterval: 30000 })
  const { resolvedTheme, setTheme } = useTheme()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState("")

  const currentPath = location.pathname
  const pageTitle = pageTitles[currentPath] || "Dashboard"
  const breadcrumbParent = currentPath.split("/").filter(Boolean)[0]

  const handleLogout = async () => {
    await logout()
    window.location.href = "/login"
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onMenuToggle} className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0">
            <div className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground sm:flex">
              <span className="capitalize">{breadcrumbParent || "Home"}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">{pageTitle}</span>
            </div>
            <h1 className="truncate text-lg font-bold text-[#111827] dark:text-foreground md:text-xl">{pageTitle}</h1>
          </div>
        </div>

        <div className="hidden max-w-md flex-1 lg:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders, customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="hidden sm:flex">
            {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button variant="ghost" size="icon" asChild className="relative">
            <Link to="/notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-xs">{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold leading-none">{user?.name}</p>
                  <Badge variant={roleBadgeVariant[user?.role || "client"] || "secondary"} className="mt-1 capitalize">
                    {user?.role}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs font-medium text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
