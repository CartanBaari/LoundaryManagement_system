import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import {
  ShoppingCart,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  ClipboardList,
  CalendarDays,
  Package,
  Truck,
  ListTodo,
  Target,
  Eye,
  RefreshCw,
  Activity,
  CheckCircle2,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { useOrders } from "@/hooks/useOrders"
import { useNotifications } from "@/hooks/useNotifications"
import { paymentAPI, userAPI } from "@/services/api"
import StatCard from "@/components/shared/StatCard"
import PageHeader from "@/components/shared/PageHeader"
import StatusBadge from "@/components/shared/StatusBadge"
import DataTable from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatCurrency, getInitials, calculatePercentageChange, formatDate } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

const isSameDay = (value, reference = new Date()) => {
  if (!value) return false
  const date = new Date(value)
  const ref = new Date(reference)
  return date.toDateString() === ref.toDateString()
}

const formatItemTypes = (items = []) => {
  if (!items.length) return "N/A"
  const uniqueTypes = [
    ...new Set(items.map((item) => item.serviceName || item.itemType || "Other").filter(Boolean)),
  ]
  return uniqueTypes.join(", ")
}

const WORKFLOW_STAGES = [
  {
    key: "received",
    label: "Received",
    match: (order) => order.status === "pending" && new Date(order.updatedAt).getTime() === new Date(order.createdAt).getTime(),
  },
  {
    key: "sorting",
    label: "Sorting",
    match: (order) => order.status === "pending" && new Date(order.updatedAt).getTime() > new Date(order.createdAt).getTime(),
  },
  { key: "washing", label: "Washing", match: (order) => order.status === "washing" },
  { key: "drying", label: "Drying", match: (order) => order.status === "drying" },
  {
    key: "ironing",
    label: "Ironing",
    match: (order) =>
      ["washing", "drying"].includes(order.status) &&
      order.items?.some((item) => item.serviceType === "iron" || item.serviceType === "dryClean"),
  },
  {
    key: "packaging",
    label: "Packaging",
    match: (order) => order.status === "ready" && !isSameDay(order.deliveryDate),
  },
  { key: "readyForPickup", label: "Ready for Pickup", match: (order) => order.status === "ready" },
  {
    key: "outForDelivery",
    label: "Out for Delivery",
    match: (order) => order.status === "ready" && isSameDay(order.deliveryDate),
  },
]

const ACTIVITY_TYPES = new Set(["assignment", "status_update", "delivered", "ready_order"])

const getActivityMeta = (notification) => {
  const orderNumber =
    notification.orderId?.orderNumber || notification.message.match(/ORD-[\d-]+/)?.[0] || "Order"

  const labels = {
    assignment: "New order assigned",
    status_update: "Order status updated",
    delivered: "Order completed",
    ready_order: "Order ready for pickup",
  }

  return {
    id: notification._id,
    label: labels[notification.type] || "Activity update",
    orderNumber,
    message: notification.message,
    timeAgo: formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }),
  }
}

function StaffDashboard({ user }) {
  const { orders, fetchOrders, loading } = useOrders()
  const { notifications, fetchNotifications, loading: notificationsLoading } = useNotifications()
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setStatsLoading(true)
        await Promise.all([
          fetchOrders({ assignedStaff: user._id }),
          fetchNotifications(25),
        ])
      } catch {
        toast.error("Failed to load dashboard data")
      } finally {
        setStatsLoading(false)
      }
    }

    if (user) loadData()
  }, [user, fetchOrders, fetchNotifications])

  const stats = useMemo(() => {
    const activeOrders = orders.filter((order) => !["delivered", "cancelled"].includes(order.status))
    const todaysOrders = orders.filter(
      (order) => isSameDay(order.pickupDate) || isSameDay(order.createdAt)
    )
    const inProgress = orders.filter((order) => ["pending", "washing", "drying"].includes(order.status))
    const completedToday = orders.filter(
      (order) => order.status === "delivered" && isSameDay(order.deliveredAt || order.updatedAt)
    )
    const readyForPickup = orders.filter((order) => order.status === "ready")
    const readyForDelivery = orders.filter(
      (order) => order.status === "ready" && isSameDay(order.deliveryDate)
    )
    const pendingTasks = activeOrders.length
    const assignedToday = todaysOrders.length
    const performanceToday =
      assignedToday > 0
        ? Math.round((completedToday.length / assignedToday) * 100)
        : completedToday.length > 0
          ? 100
          : 0

    return {
      myAssignedOrders: orders.length,
      todaysOrders: todaysOrders.length,
      inProgress: inProgress.length,
      completedToday: completedToday.length,
      readyForPickup: readyForPickup.length,
      readyForDelivery: readyForDelivery.length,
      pendingTasks,
      performanceToday,
    }
  }, [orders])

  const workflowSummary = useMemo(
    () =>
      WORKFLOW_STAGES.map((stage) => ({
        ...stage,
        count: orders.filter(stage.match).length,
      })),
    [orders]
  )

  const workflowMax = useMemo(
    () => Math.max(...workflowSummary.map((stage) => stage.count), 1),
    [workflowSummary]
  )

  const todaysTasks = useMemo(
    () =>
      orders
        .filter((order) => {
          if (["delivered", "cancelled"].includes(order.status)) return false
          return isSameDay(order.pickupDate) || isSameDay(order.deliveryDate)
        })
        .sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate)),
    [orders]
  )

  const recentActivity = useMemo(
    () =>
      notifications
        .filter((notification) => ACTIVITY_TYPES.has(notification.type))
        .slice(0, 8)
        .map(getActivityMeta),
    [notifications]
  )

  const assignedOrderColumns = useMemo(
    () => [
      {
        accessorKey: "orderNumber",
        header: "Order ID",
        cell: ({ row }) => (
          <span className="font-semibold">{row.original.orderNumber}</span>
        ),
      },
      {
        id: "customer",
        accessorFn: (row) => row.userId?.name || "Customer",
        header: "Customer",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {getInitials(row.original.userId?.name)}
              </AvatarFallback>
            </Avatar>
            <span>{row.original.userId?.name || "Customer"}</span>
          </div>
        ),
      },
      {
        id: "service",
        accessorFn: (row) => formatItemTypes(row.items),
        header: "Service",
        cell: ({ row }) => (
          <span className="max-w-[180px] truncate text-sm">{formatItemTypes(row.original.items)}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Current Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status === "delivered" ? "completed" : row.original.status} />
        ),
      },
      {
        id: "dueDate",
        accessorFn: (row) => row.deliveryDate,
        header: "Due Date",
        cell: ({ row }) => formatDate(row.original.deliveryDate),
      },
      {
        id: "action",
        header: "Action",
        cell: ({ row }) => (
          <Button variant="outline" size="sm" onClick={() => setSelectedOrder(row.original)}>
            <Eye className="mr-1 h-4 w-4" />
            View
          </Button>
        ),
      },
    ],
    []
  )

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const isLoading = loading || statsLoading

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${getGreeting()}, ${user?.name?.split(" ")[0] || "there"}`}
        description="Your assigned orders, tasks, and workflow progress for today."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
        <StatCard icon={ClipboardList} label="My Assigned Orders" value={stats.myAssignedOrders} loading={isLoading} />
        <StatCard icon={CalendarDays} label="Today's Orders" value={stats.todaysOrders} loading={isLoading} />
        <StatCard icon={RefreshCw} label="Orders In Progress" value={stats.inProgress} loading={isLoading} />
        <StatCard icon={CheckCircle} label="Completed Orders Today" value={stats.completedToday} loading={isLoading} />
        <StatCard icon={Package} label="Ready for Pickup" value={stats.readyForPickup} loading={isLoading} />
        <StatCard icon={Truck} label="Ready for Delivery" value={stats.readyForDelivery} loading={isLoading} />
        <StatCard icon={ListTodo} label="Pending Tasks" value={stats.pendingTasks} loading={isLoading} />
        <StatCard
          icon={Target}
          label="My Performance Today"
          value={`${stats.performanceToday}%`}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Assigned Orders</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/orders">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={assignedOrderColumns}
            data={orders}
            searchKey="orderNumber"
            searchPlaceholder="Search assigned orders..."
            loading={isLoading}
            emptyTitle="No assigned orders"
            emptyDescription="Orders assigned to you will appear here."
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Laundry Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {workflowSummary.map((stage) => (
                  <div
                    key={stage.key}
                    className="rounded-[10px] border border-border p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{stage.label}</p>
                      <span className="text-lg font-bold">{stage.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.max((stage.count / workflowMax) * 100, stage.count > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                  </div>
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
              <Link to="/orders">
                <RefreshCw className="mr-2 h-4 w-4" />
                Update Order Status
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/orders">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark Order as Completed
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/orders">
                <ShoppingCart className="mr-2 h-4 w-4" />
                View My Orders
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : todaysTasks.length === 0 ? (
              <p className="py-8 text-center text-sm font-medium text-muted-foreground">
                No tasks scheduled for today
              </p>
            ) : (
              <div className="space-y-3">
                {todaysTasks.map((order) => (
                  <button
                    key={order._id}
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="flex w-full items-center justify-between rounded-[10px] border border-border p-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <div>
                      <p className="text-sm font-semibold">{order.orderNumber}</p>
                      <p className="text-xs font-medium text-muted-foreground">
                        {order.userId?.name || "Customer"} • Due {formatDate(order.deliveryDate)}
                      </p>
                    </div>
                    <StatusBadge status={order.status === "delivered" ? "completed" : order.status} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || notificationsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="py-8 text-center text-sm font-medium text-muted-foreground">
                No recent activity yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-[10px] border border-border p-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10">
                      {activity.label.includes("assigned") ? (
                        <UserPlus className="h-4 w-4 text-primary" />
                      ) : activity.label.includes("completed") ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <Activity className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{activity.label}</p>
                      <p className="truncate text-xs font-medium text-muted-foreground">
                        {activity.orderNumber}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{activity.timeAgo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                <div className="mt-1">
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[10px] bg-muted/50 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Items</p>
                  <p className="mt-1 text-lg font-bold">{selectedOrder.items?.length || 0}</p>
                </div>
                <div className="rounded-[10px] bg-muted/50 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Due Date</p>
                  <p className="mt-1 text-sm font-bold">{formatDate(selectedOrder.deliveryDate)}</p>
                </div>
              </div>
              <div className="rounded-[10px] bg-muted/50 p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Services</p>
                <p className="text-sm font-medium">{formatItemTypes(selectedOrder.items)}</p>
              </div>
              <Button className="w-full" asChild>
                <Link to="/orders">Manage in Orders</Link>
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function AdminClientDashboard() {
  const { user } = useAuth()
  const { orders, fetchOrders, loading } = useOrders()
  const [customers, setCustomers] = useState([])
  const [paymentStats, setPaymentStats] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setStatsLoading(true)
        const params = {}
        if (user?.role === "client") params.userId = user._id

        await fetchOrders(params)

        if (user?.role === "admin") {
          const paymentStatsResponse = await paymentAPI.getStats()
          setPaymentStats(paymentStatsResponse.data?.stats || null)
        } else {
          setPaymentStats(null)
        }

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
    const orderRevenue = completed.reduce((sum, o) => sum + (o.totalAmount || 0), 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const orderTodayRevenue = completed
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

    const usesPaymentRevenue = Boolean(paymentStats)
    const revenue = usesPaymentRevenue ? paymentStats.totalRevenue || 0 : orderRevenue
    const todayRevenue = usesPaymentRevenue ? paymentStats.todayRevenue || 0 : orderTodayRevenue
    const revenueChange = usesPaymentRevenue
      ? calculatePercentageChange(paymentStats.lastWeekCollected || 0, paymentStats.prevWeekCollected || 0)
      : calculatePercentageChange(
          recentOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + (o.totalAmount || 0), 0),
          prevWeekOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + (o.totalAmount || 0), 0)
        )

    return {
      totalOrders: orders.length,
      pendingOrders: pending.length,
      completedOrders: completed.length,
      revenue,
      customers: customers.length,
      todayRevenue,
      orderChange: calculatePercentageChange(recentOrders.length, prevWeekOrders.length),
      revenueChange,
    }
  }, [orders, customers, paymentStats])

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
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

export default function Dashboard() {
  const { user } = useAuth()

  if (user?.role === "staff") {
    return <StaffDashboard user={user} />
  }

  return <AdminClientDashboard />
}
