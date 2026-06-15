import { useEffect, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import {
  Bell,
  CheckCheck,
  Info,
  Mail,
  MessageSquare,
  Trash2,
} from "lucide-react"
import { useNotifications } from "@/hooks/useNotifications"
import { useAuth } from "@/context/AuthContext"
import PageHeader from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/PageHeader"
import StatusBadge from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

const fallbackNotifications = [
  {
    _id: "demo-ready-1",
    type: "ready_order",
    message: "Order ORD-20260404-11802-8232 is now ready for pickup or delivery.",
    createdAt: new Date().toISOString(),
    isRead: false,
    orderId: { orderNumber: "ORD-20260404-11802-8232", status: "ready" },
  },
  {
    _id: "demo-new-1",
    type: "new_order",
    message: "New order ORD-20260401-140956-7972 was created for Baari Shire Maxamed.",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    isRead: false,
    orderId: { orderNumber: "ORD-20260401-140956-7972", status: "pending" },
  },
  {
    _id: "demo-assignment-1",
    type: "assignment",
    message: "A new order ORD-20260404-11802-8232 has been assigned to you.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    isRead: true,
    orderId: { orderNumber: "ORD-20260404-11802-8232", status: "pending" },
  },
]

const getNotificationMeta = (notification) => {
  const createdAt = notification.createdAt ? new Date(notification.createdAt) : new Date()
  const orderNumber =
    notification.orderId?.orderNumber || notification.message.match(/ORD-[\d-]+/)?.[0] || "Order"
  const status = notification.orderId?.status || (notification.type === "ready_order" ? "ready" : "pending")
  const customerName = notification.orderId?.userId?.name || "Unknown customer"
  const customerEmail = notification.orderId?.userId?.email || "No email available"

  return {
    ...notification,
    createdAt,
    orderNumber,
    status,
    customerName,
    customerEmail,
    timeAgo: formatDistanceToNow(createdAt, { addSuffix: true }),
  }
}

function NotificationCard({ row, onMarkAsRead, onDelete, showCustomer = false }) {
  return (
    <Card className={!row.isRead ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{row.orderNumber}</h3>
              {!row.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
            </div>
            {showCustomer && (
              <p className="mt-1 text-sm text-muted-foreground">
                {row.customerName} • {row.customerEmail}
              </p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{row.message}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={row.status} />
            <span className="text-xs text-muted-foreground">{row.timeAgo}</span>
            {!row.isRead && (
              <Button variant="outline" size="sm" onClick={() => onMarkAsRead(row)}>
                Mark read
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onDelete(row)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Notifications() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [activeTab, setActiveTab] = useState("all")
  const [adminTab, setAdminTab] = useState("ready")
  const [searchTerm, setSearchTerm] = useState("")
  const [demoNotifications, setDemoNotifications] = useState(fallbackNotifications)
  const [checkingEmailStatus, setCheckingEmailStatus] = useState(false)

  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendBroadcast,
    emailStatus,
    fetchEmailStatus,
  } = useNotifications()

  useEffect(() => {
    fetchNotifications(60)
  }, [fetchNotifications])

  useEffect(() => {
    if (isAdmin) {
      setCheckingEmailStatus(true)
      fetchEmailStatus().finally(() => setCheckingEmailStatus(false))
    }
  }, [fetchEmailStatus, isAdmin])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const usingFallback = Boolean(error)

  const activityFeed = useMemo(() => {
    const source = usingFallback ? demoNotifications : notifications
    return source
      .map(getNotificationMeta)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [notifications, demoNotifications, usingFallback])

  const query = searchTerm.trim().toLowerCase()

  const filterByQuery = (item) =>
    !query || `${item.orderNumber} ${item.message} ${item.status}`.toLowerCase().includes(query)

  const readyOrderNotifications = useMemo(
    () =>
      activityFeed.filter(
        (item) =>
          (item.type === "ready_order" || item.status === "ready") && filterByQuery(item)
      ),
    [activityFeed, query]
  )

  const recentOrderNotifications = useMemo(
    () =>
      activityFeed.filter(
        (item) =>
          (item.type === "new_order" || item.type === "order_created") && filterByQuery(item)
      ),
    [activityFeed, query]
  )

  const filteredFeed = useMemo(() => {
    let items = activityFeed.filter(filterByQuery)
    if (activeTab === "unread") items = items.filter((i) => !i.isRead)
    else if (activeTab === "read") items = items.filter((i) => i.isRead)
    return items
  }, [activityFeed, activeTab, query])

  const handleMarkAsRead = async (notification) => {
    if (notification.isRead) return
    if (usingFallback) {
      setDemoNotifications((c) =>
        c.map((e) => (e._id === notification._id ? { ...e, isRead: true } : e))
      )
      toast.success("Demo notification marked as read.")
      return
    }
    await markAsRead(notification._id)
    toast.success("Notification marked as read.")
  }

  const handleDelete = async (notification) => {
    if (usingFallback) {
      setDemoNotifications((c) => c.filter((e) => e._id !== notification._id))
      toast.success("Demo notification removed.")
      return
    }
    await deleteNotification(notification._id)
    toast.success("Notification deleted.")
  }

  const handleMarkAll = async () => {
    if (usingFallback) {
      setDemoNotifications((c) => c.map((e) => ({ ...e, isRead: true })))
      toast.success("Demo notifications marked as read.")
      return
    }
    await markAllAsRead()
    toast.success("All notifications marked as read.")
  }

  const handleSendAllReadyMessage = async () => {
    if (!readyOrderNotifications.length) {
      toast.error("There are no ready-order notifications to send.")
      return
    }
    if (isAdmin && !emailReady) {
      toast.error(emailStatus.message || "Email service is not configured correctly yet.")
      return
    }
    const readyOrderList = readyOrderNotifications.slice(0, 10).map((i) => i.orderNumber).join(", ")
    try {
      const response = await sendBroadcast({
        message: `Ready order update: the following orders are ready for pickup or delivery - ${readyOrderList}.`,
      })
      toast.success(response.message)
    } catch (sendError) {
      toast.error(sendError.response?.data?.message || "Failed to send the ready-order message.")
    }
  }

  const emailReady = !isAdmin || emailStatus.configured
  const displayUnread = usingFallback
    ? activityFeed.filter((i) => !i.isRead).length
    : unreadCount

  const adminRows = adminTab === "ready" ? readyOrderNotifications : recentOrderNotifications

  return (
    <div className="space-y-8">
      <PageHeader
        title={isAdmin ? "Notification Center" : "Activity Stream"}
        description={
          isAdmin
            ? "Track ready-order alerts and recently created orders."
            : "Keep track of every flow in your laundry operations."
        }
        icon={Bell}
        action={
          <div className="flex gap-2">
            <Badge variant="secondary">{displayUnread} unread</Badge>
            <Button variant="outline" onClick={handleMarkAll}>
              <CheckCheck className="mr-2 h-4 w-4" />Mark all read
            </Button>
          </div>
        }
      />

      <Input
        placeholder="Search notifications..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      {isAdmin ? (
        <>
          <Tabs value={adminTab} onValueChange={setAdminTab}>
            <TabsList>
              <TabsTrigger value="ready">Ready Orders ({readyOrderNotifications.length})</TabsTrigger>
              <TabsTrigger value="recent">Recent Orders ({recentOrderNotifications.length})</TabsTrigger>
            </TabsList>
          </Tabs>

          {adminTab === "ready" && !emailReady && (
            <div className="flex items-start gap-3 rounded-[10px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <Info className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Customer email is not ready yet.</p>
                <p className="mt-1 text-sm">
                  {checkingEmailStatus ? "Checking email configuration..." : emailStatus.message}
                </p>
              </div>
            </div>
          )}

          {adminTab === "ready" && (
            <div className="flex justify-end">
              <Button
                onClick={handleSendAllReadyMessage}
                disabled={!emailReady || checkingEmailStatus}
              >
                <Mail className="mr-2 h-4 w-4" />
                {checkingEmailStatus ? "Checking Email..." : "Send All Message"}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-[16px]" />)}
            </div>
          ) : adminRows.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No notifications found"
              description="New order notifications will appear here."
            />
          ) : (
            <div className="space-y-3">
              {adminRows.map((row) => (
                <NotificationCard
                  key={row._id}
                  row={row}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  showCustomer={adminTab === "ready"}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="read">Read</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-[16px]" />)}
            </div>
          ) : filteredFeed.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications to display"
              description="Your operations are flowing smoothly. Check back later."
            />
          ) : (
            <div className="space-y-3">
              {filteredFeed.map((row) => (
                <NotificationCard
                  key={row._id}
                  row={row}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
