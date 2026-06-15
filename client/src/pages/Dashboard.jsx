import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ShoppingCart,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  TrendingUp,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { useOrders } from "@/hooks/useOrders"
import { userAPI } from "@/services/api"
import StatCard from "@/components/shared/StatCard"
import PageHeader from "@/components/shared/PageHeader"
import StatusBadge from "@/components/shared/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatCurrency, getInitials, calculatePercentageChange } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export default function Dashboard() {
  const { user } = useAuth()
  const { orders, fetchOrders, loading } = useOrders()
  const [customers, setCustomers] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setStatsLoading(true)
        const params = {}
        if (user?.role === "staff") params.assignedStaff = user._id
        if (user?.role === "client") params.userId = user._id

        await fetchOrders(params)

        if (user?.role === "admin") {
          const response = await userAPI.getAll({ role: "client" })
          setCustomers(response.data?.users || [])
        }
      } catch {
        toast.error("Failed to load dashboard data")
      } finally {
        setStatsLoading(false)
      }
    }

    if (user) loadData()
  }, [user, fetchOrders])

  const stats = useMemo(() => {
    const completed = orders.filter((o) => o.status === "delivered")
    const pending = orders.filter((o) => !["delivered", "cancelled"].includes(o.status))
    const revenue = completed.reduce((sum, o) => sum + (o.totalAmount || 0), 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayRevenue = completed
      .filter((o) => new Date(o.updatedAt || o.createdAt) >= today)
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    const recentOrders = orders.filter((o) => new Date(o.createdAt) >= lastWeek)
    const prevWeekStart = new Date(lastWeek)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)
    const prevWeekOrders = orders.filter((o) => {
      const d = new Date(o.createdAt)
      return d >= prevWeekStart && d < lastWeek
    })

    return {
      totalOrders: orders.length,
      pendingOrders: pending.length,
      completedOrders: completed.length,
      revenue,
      customers: customers.length,
      todayRevenue,
      orderChange: calculatePercentageChange(recentOrders.length, prevWeekOrders.length),
      revenueChange: calculatePercentageChange(
        recentOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + (o.totalAmount || 0), 0),
        prevWeekOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + (o.totalAmount || 0), 0)
      ),
    }
  }, [orders, customers])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const recentOrders = orders.slice(0, 6)

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${getGreeting()}, ${user?.name?.split(" ")[0] || "there"}`}
        description="Here's what's happening with your laundry business today."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard icon={ShoppingCart} label="Total Orders" value={stats.totalOrders} change={stats.orderChange} loading={loading || statsLoading} />
        <StatCard icon={DollarSign} label="Revenue" value={formatCurrency(stats.revenue)} change={stats.revenueChange} loading={loading || statsLoading} />
        {user?.role === "admin" && (
          <StatCard icon={Users} label="Customers" value={stats.customers} loading={loading || statsLoading} />
        )}
        <StatCard icon={Clock} label="Pending Orders" value={stats.pendingOrders} loading={loading || statsLoading} />
        <StatCard icon={CheckCircle} label="Completed Orders" value={stats.completedOrders} loading={loading || statsLoading} />
        <StatCard icon={TrendingUp} label="Today's Revenue" value={formatCurrency(stats.todayRevenue)} loading={loading || statsLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/orders">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm font-medium text-muted-foreground">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <button
                    key={order._id}
                    onClick={() => setSelectedOrder(order)}
                    className="flex w-full items-center justify-between rounded-[10px] border border-border p-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-xs">{getInitials(order.userId?.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{order.orderNumber}</p>
                        <p className="text-xs font-medium text-muted-foreground">{order.userId?.name || "Customer"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={order.status === "delivered" ? "completed" : order.status} />
                      <span className="text-sm font-bold">{formatCurrency(order.totalAmount || 0)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" asChild>
              <Link to="/orders"><ShoppingCart className="mr-2 h-4 w-4" />Manage Orders</Link>
            </Button>
            {user?.role === "admin" && (
              <>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/customers"><Users className="mr-2 h-4 w-4" />View Customers</Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/reports"><TrendingUp className="mr-2 h-4 w-4" />View Reports</Link>
                </Button>
              </>
            )}
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/payments"><DollarSign className="mr-2 h-4 w-4" />Payments</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedOrder?.orderNumber}</SheetTitle>
            <SheetDescription>{selectedOrder?.userId?.name}</SheetDescription>
          </SheetHeader>
          {selectedOrder && (
            <div className="mt-6 space-y-4">
              <div className="rounded-[10px] bg-muted/50 p-4">
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <div className="mt-1"><StatusBadge status={selectedOrder.status} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[10px] bg-muted/50 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Items</p>
                  <p className="mt-1 text-lg font-bold">{selectedOrder.items?.length || 0}</p>
                </div>
                <div className="rounded-[10px] bg-muted/50 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Total</p>
                  <p className="mt-1 text-lg font-bold">{formatCurrency(selectedOrder.totalAmount || 0)}</p>
                </div>
              </div>
              <div className="rounded-[10px] bg-muted/50 p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Order Items</p>
                <ul className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <li key={idx} className="text-sm font-medium">
                      {item.serviceName || item.itemType} × {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
