import { useEffect, useMemo, useState } from "react"
import {
  Plus,
  ShoppingCart,
  CalendarDays,
  Send,
  MessageSquare,
  Eye,
  Edit2,
  Trash2,
  UserCheck,
  MoreHorizontal,
  FileText,
  Printer,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { useOrders } from "@/hooks/useOrders"
import { useNotifications } from "@/hooks/useNotifications"
import NewOrder from "./NewOrder"
import { userAPI } from "@/services/api"
import PageHeader from "@/components/shared/PageHeader"
import DataTable from "@/components/shared/DataTable"
import StatusBadge, { PaymentStatusBadge } from "@/components/shared/StatusBadge"
import OrderTimeline from "@/components/shared/OrderTimeline"
import StatCard from "@/components/shared/StatCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatCurrency, formatDate, formatStaffWorkloadLabel, toDateInputValue, isStaffAtCapacity, buildStaffPickupDateLoadMap, getStaffCapacityForDate, getStaffRemainingCapacity } from "@/lib/utils"
import StaffCapacityDetails from "@/components/shared/StaffCapacityDetails"

const UNASSIGNED_STAFF_VALUE = "unassigned"
const ASSIGN_STAFF_PLACEHOLDER = "select-staff"

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

const PROCESSING_STATUSES = ["washing", "drying", "ready"]

const formatItemTypes = (items = []) => {
  if (!items.length) return "N/A"
  const uniqueTypes = [
    ...new Set(items.map((item) => item.serviceName || item.itemType || "Other").filter(Boolean)),
  ]
  return uniqueTypes.join(", ")
}

export default function Orders() {
  const { user } = useAuth()
  const { orders, fetchOrders, updateOrder, deleteOrder, loading } = useOrders()
  const { sendBroadcast, sendDirect } = useNotifications()
  const [statusFilter, setStatusFilter] = useState("all")
  const [period, setPeriod] = useState("monthly")
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date()
    const start = new Date()
    start.setMonth(end.getMonth() - 1)
    return { startDate: toDateInputValue(start), endDate: toDateInputValue(end) }
  })
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [assigningOrder, setAssigningOrder] = useState(null)
  const [deleteOrderId, setDeleteOrderId] = useState(null)
  const [staffMembers, setStaffMembers] = useState([])
  const [customers, setCustomers] = useState([])
  const [editFormData, setEditFormData] = useState({
    status: "pending",
    deliveryNotes: "",
    paymentStatus: "pending",
  })
  const [messageModal, setMessageModal] = useState(null)
  const [messageText, setMessageText] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [assignStaffId, setAssignStaffId] = useState(UNASSIGNED_STAFF_VALUE)
  const [staffWorkloads, setStaffWorkloads] = useState([])
  const [loadingWorkloads, setLoadingWorkloads] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isAdmin = user?.role === "admin"
  const canEditOrders = user?.role === "admin" || user?.role === "staff" || user?.role === "client"
  const canDeleteOrders = user?.role === "admin"
  const canManageStatus = user?.role === "admin" || user?.role === "staff"

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const params = {}
        if (user?.role === "client") params.userId = user._id
        await fetchOrders(params)
      } catch {
        toast.error("Failed to load orders")
      }
    }
    if (user) loadOrders()
  }, [user, fetchOrders])

  useEffect(() => {
    const loadStaffMembers = async () => {
      if (!isAdmin) {
        setStaffMembers([])
        setCustomers([])
        return
      }
      try {
        const [staffResponse, customersResponse] = await Promise.all([
          userAPI.getStaff(),
          userAPI.getAll({ role: "client" }),
        ])
        setStaffMembers(staffResponse.data?.staffMembers || [])
        setCustomers(customersResponse.data?.users || [])
      } catch {
        toast.error("Failed to load messaging and staff data")
      }
    }
    loadStaffMembers()
  }, [isAdmin])

  useEffect(() => {
    const end = new Date()
    const start = new Date()
    if (period === "weekly") start.setDate(end.getDate() - 6)
    else if (period === "monthly") start.setMonth(end.getMonth() - 1)
    else start.setFullYear(end.getFullYear() - 1)
    setDateRange({ startDate: toDateInputValue(start), endDate: toDateInputValue(end) })
  }, [period])

  const dateFilteredOrders = useMemo(() => {
    const start = new Date(`${dateRange.startDate}T00:00:00`)
    const end = new Date(`${dateRange.endDate}T23:59:59.999`)
    return orders.filter((o) => {
      const d = new Date(o.createdAt)
      return d >= start && d <= end
    })
  }, [orders, dateRange])

  const filteredOrders = useMemo(() => {
    let filtered = dateFilteredOrders
    if (statusFilter === "pending") {
      filtered = filtered.filter((o) => o.status === "pending")
    } else if (statusFilter === "processing") {
      filtered = filtered.filter((o) => PROCESSING_STATUSES.includes(o.status))
    } else if (statusFilter === "completed") {
      filtered = filtered.filter((o) => o.status === "delivered")
    } else if (statusFilter === "cancelled") {
      filtered = filtered.filter((o) => o.status === "cancelled")
    }
    return filtered
  }, [dateFilteredOrders, statusFilter])

  const stats = useMemo(() => {
    const pending = dateFilteredOrders.filter((o) => o.status === "pending").length
    const processing = dateFilteredOrders.filter((o) => PROCESSING_STATUSES.includes(o.status)).length
    const completed = dateFilteredOrders.filter((o) => o.status === "delivered").length
    const cancelled = dateFilteredOrders.filter((o) => o.status === "cancelled").length
    return { total: dateFilteredOrders.length, pending, processing, completed, cancelled }
  }, [dateFilteredOrders])

  const staffLoadMap = useMemo(
    () => buildStaffPickupDateLoadMap(orders),
    [orders]
  )

  const todayDateLabel = useMemo(() => formatDate(new Date()), [])

  const getStaffWorkload = (staffId) =>
    staffWorkloads.find((entry) => entry.staffId === String(staffId))

  const selectedStaffWorkload =
    assignStaffId &&
    assignStaffId !== UNASSIGNED_STAFF_VALUE &&
    assignStaffId !== ASSIGN_STAFF_PLACEHOLDER
      ? getStaffWorkload(assignStaffId)
      : null

  const currentAssignedStaffId = assigningOrder?.assignedStaff?._id
    ? String(assigningOrder.assignedStaff._id)
    : null

  const isSameStaffAssignment =
    Boolean(currentAssignedStaffId) &&
    assignStaffId !== UNASSIGNED_STAFF_VALUE &&
    assignStaffId !== ASSIGN_STAFF_PLACEHOLDER &&
    String(assignStaffId) === currentAssignedStaffId

  const openEditModal = (order) => {
    setEditingOrder(order)
    setEditFormData({
      status: order.status || "pending",
      deliveryNotes: order.deliveryNotes || "",
      paymentStatus: order.paymentStatus || "pending",
    })
  }

  const openAssignModal = async (order) => {
    setAssigningOrder(order)
    setAssignStaffId(order.assignedStaff?._id ? ASSIGN_STAFF_PLACEHOLDER : UNASSIGNED_STAFF_VALUE)
    setStaffWorkloads([])
    setLoadingWorkloads(true)
    try {
      const pickupDate = order.pickupDate
        ? toDateInputValue(order.pickupDate)
        : toDateInputValue(new Date())
      const response = await userAPI.getStaffWorkload({
        date: pickupDate,
        excludeOrderId: order._id,
      })
      setStaffWorkloads(response.data?.workloads || [])
    } catch {
      toast.error("Failed to load staff workload")
    } finally {
      setLoadingWorkloads(false)
    }
  }

  const closeModals = () => {
    setEditingOrder(null)
    setAssigningOrder(null)
    setMessageModal(null)
    setMessageText("")
    setSelectedCustomerId("")
    setEditFormData({ status: "pending", deliveryNotes: "", paymentStatus: "pending" })
    setAssignStaffId(UNASSIGNED_STAFF_VALUE)
    setStaffWorkloads([])
  }

  const handleUpdateOrder = async (e) => {
    e.preventDefault()
    if (!editingOrder) return
    setSubmitting(true)
    try {
      const payload =
        user?.role !== "admin"
          ? { deliveryNotes: editFormData.deliveryNotes }
          : {
              status: editFormData.status,
              deliveryNotes: editFormData.deliveryNotes,
              paymentStatus: editFormData.paymentStatus,
            }
      await updateOrder(editingOrder._id, payload)
      toast.success("Order updated successfully")
      closeModals()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update order")
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteOrderId) return
    try {
      await deleteOrder(deleteOrderId)
      toast.success("Order deleted successfully")
      if (selectedOrder?._id === deleteOrderId) setSelectedOrder(null)
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete order")
    } finally {
      setDeleteOrderId(null)
    }
  }

  const handleAssignOrder = async (e) => {
    e.preventDefault()
    if (!assigningOrder) return

    if (assignStaffId === ASSIGN_STAFF_PLACEHOLDER) {
      toast.error("Please select a staff member")
      return
    }

    if (isSameStaffAssignment) {
      toast.error("Order is already assigned to this staff member. Please select a different staff member.")
      return
    }

    if (assignStaffId !== UNASSIGNED_STAFF_VALUE && isStaffAtCapacity(selectedStaffWorkload)) {
      toast.error(
        selectedStaffWorkload
          ? `${selectedStaffWorkload.name} already has the maximum ${selectedStaffWorkload.dailyCapacity} orders for this day`
          : "Selected staff member is at full capacity for this day"
      )
      return
    }

    setSubmitting(true)
    try {
      await updateOrder(assigningOrder._id, {
        assignedStaff: assignStaffId === UNASSIGNED_STAFF_VALUE ? null : assignStaffId,
      })
      toast.success("Staff assigned successfully")
      closeModals()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign staff")
    } finally {
      setSubmitting(false)
    }
  }

  const openMessageModal = (mode, order = null) => {
    setMessageModal({ mode, order })
    setMessageText("")
    setSelectedCustomerId(order?.userId?._id || "")
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!messageText.trim()) {
      toast.error("Enter a message first")
      return
    }
    setSubmitting(true)
    try {
      if (messageModal?.mode === "all") {
        const response = await sendBroadcast({ message: messageText.trim() })
        toast.success(response.message)
      } else {
        const targetUserId =
          messageModal?.mode === "single" ? messageModal?.order?.userId?._id : selectedCustomerId
        if (!targetUserId) {
          toast.error("Select a customer first")
          setSubmitting(false)
          return
        }
        const response = await sendDirect({ userId: targetUserId, message: messageText.trim() })
        toast.success(response.message)
      }
      closeModals()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message")
    } finally {
      setSubmitting(false)
    }
  }

  const columns = useMemo(
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
        accessorFn: (row) => row.userId?.name || "N/A",
        header: "Customer",
      },
      {
        id: "orderType",
        accessorFn: (row) => formatItemTypes(row.items),
        header: "Order Type",
        cell: ({ row }) => (
          <span className="max-w-[180px] whitespace-normal">{formatItemTypes(row.original.items)}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "paymentStatus",
        header: "Payment",
        cell: ({ row }) => (
          <PaymentStatusBadge status={row.original.paymentStatus || "pending"} />
        ),
      },
      ...(isAdmin
        ? [
            {
              id: "assignedStaff",
              accessorFn: (row) => row.assignedStaff?.name || "Unassigned",
              header: "Assigned Staff",
              cell: ({ row }) => {
                const order = row.original
                const staff = order.assignedStaff
                if (!staff?.name) {
                  return <span className="text-muted-foreground">Unassigned</span>
                }

                const load = getStaffCapacityForDate(
                  staff._id,
                  order.pickupDate || order.createdAt,
                  staffLoadMap,
                  staffMembers
                )

                return (
                  <div className="min-w-[140px]">
                    <p className="font-medium">{staff.name}</p>
                    <p className={`text-xs ${load.isAtCapacity ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                      {load.assigned}/{load.capacity} assigned · {load.remaining} left
                    </p>
                  </div>
                )
              },
            },
          ]
        : []),
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        accessorKey: "totalAmount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-medium">{formatCurrency(row.original.totalAmount || 0)}</span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const order = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                  <Eye className="mr-2 h-4 w-4" />View Details
                </DropdownMenuItem>
                {canEditOrders && (
                  <DropdownMenuItem onClick={() => openEditModal(order)}>
                    <Edit2 className="mr-2 h-4 w-4" />Edit
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onClick={() => openMessageModal("single", order)}>
                    <MessageSquare className="mr-2 h-4 w-4" />Message Customer
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onClick={() => openAssignModal(order)}>
                    <UserCheck className="mr-2 h-4 w-4" />Assign Staff
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {canDeleteOrders && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteOrderId(order._id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [isAdmin, canEditOrders, canDeleteOrders, staffLoadMap, staffMembers]
  )

  return (
    <div className="space-y-8">
      <PageHeader
        title="Orders"
        description="Manage and track all orders"
        icon={ShoppingCart}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <Button variant="outline" onClick={() => openMessageModal("all")}>
                  <Send className="mr-2 h-4 w-4" />Message All
                </Button>
                <Button variant="outline" onClick={() => openMessageModal("customer")}>
                  <MessageSquare className="mr-2 h-4 w-4" />Message Customer
                </Button>
              </>
            )}
            {(user?.role === "admin" || user?.role === "client") && (
              <Button onClick={() => setShowCreateOrderModal(true)}>
                <Plus className="mr-2 h-4 w-4" />New Order
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orders" value={stats.total} icon={ShoppingCart} />
        <StatCard label="Pending" value={stats.pending} icon={ShoppingCart} />
        <StatCard label="Processing" value={stats.processing} icon={ShoppingCart} />
        <StatCard label="Completed" value={stats.completed} icon={ShoppingCart} />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))}
            className="w-auto"
          />
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={filteredOrders}
        searchKey="orderNumber"
        searchPlaceholder="Search by order ID or customer..."
        loading={loading}
        emptyTitle="No orders found"
        emptyDescription="Try adjusting your filters or create a new order."
      />

      {/* Order Detail Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedOrder && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle>{selectedOrder.orderNumber}</SheetTitle>
                <SheetDescription>
                  {selectedOrder.userId?.name || "N/A"} • {formatDate(selectedOrder.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <OrderTimeline status={selectedOrder.status} />

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[10px] bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Order Type</p>
                  <p className="mt-1 text-sm font-semibold">{formatItemTypes(selectedOrder.items)}</p>
                </div>
                <div className="rounded-[10px] bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Amount</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatCurrency(selectedOrder.totalAmount || 0)}
                  </p>
                </div>
              </div>

              <div className="rounded-[10px] bg-muted/50 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Status</p>
                <div className="mt-2">
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </div>

              <div className="rounded-[10px] bg-muted/50 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Payment Status</p>
                <div className="mt-2">
                  <PaymentStatusBadge status={selectedOrder.paymentStatus || "pending"} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-[10px] bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Pickup Address</p>
                  <p className="mt-1 text-sm">{selectedOrder.pickupAddress || "Not provided"}</p>
                </div>
                <div className="rounded-[10px] bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Delivery Address</p>
                  <p className="mt-1 text-sm">{selectedOrder.deliveryAddress || "Not provided"}</p>
                </div>
              </div>

              <div className="rounded-[10px] bg-muted/50 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Delivery Notes</p>
                <p className="mt-1 text-sm">{selectedOrder.deliveryNotes || "No notes added"}</p>
              </div>

              {isAdmin && (
                <div className="rounded-[10px] bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Assigned Staff</p>
                  <p className="mt-1 text-sm">{selectedOrder.assignedStaff?.name || "Unassigned"}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedOrder(selectedOrder)
                    setTimeout(() => window.print(), 300)
                  }}
                >
                  <Printer className="mr-2 h-4 w-4" />Print
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.success("Invoice ready")}>
                  <FileText className="mr-2 h-4 w-4" />Invoice
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={() => closeModals()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order</DialogTitle>
            <DialogDescription>{editingOrder?.orderNumber}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateOrder} className="space-y-4">
            {canManageStatus && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value) => setEditFormData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="washing">Washing</SelectItem>
                    <SelectItem value="drying">Drying</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {isAdmin && (
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select
                  value={editFormData.paymentStatus}
                  onValueChange={(value) =>
                    setEditFormData((prev) => ({ ...prev, paymentStatus: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Not Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Delivery Notes</Label>
              <Textarea
                value={editFormData.deliveryNotes}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, deliveryNotes: e.target.value }))
                }
                rows={4}
                placeholder="Add delivery notes"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModals}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Update Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Staff Dialog */}
      <Dialog open={!!assigningOrder} onOpenChange={() => closeModals()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Staff</DialogTitle>
            <DialogDescription>{assigningOrder?.orderNumber}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignOrder} className="space-y-4">
            <div className="rounded-[10px] bg-muted/50 p-3 text-sm text-muted-foreground">
              Received Date:{" "}
              <span className="font-semibold text-foreground">
                {assigningOrder?.pickupDate ? formatDate(assigningOrder.pickupDate) : "Today"}
              </span>
            </div>
            {assigningOrder?.assignedStaff?.name && (
              <div className="rounded-[10px] border border-border bg-muted/30 p-3 text-sm">
                Currently assigned to{" "}
                <span className="font-semibold text-foreground">{assigningOrder.assignedStaff.name}</span>.
                Select a different staff member to reassign.
              </div>
            )}
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={assignStaffId} onValueChange={setAssignStaffId} disabled={loadingWorkloads}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingWorkloads ? "Loading workload..." : "Unassigned"} />
                </SelectTrigger>
                <SelectContent>
                  {assigningOrder?.assignedStaff?._id && (
                    <SelectItem value={ASSIGN_STAFF_PLACEHOLDER} disabled>
                      Select a different staff member
                    </SelectItem>
                  )}
                  <SelectItem value={UNASSIGNED_STAFF_VALUE}>Unassigned</SelectItem>
                  {staffMembers.map((staff) => {
                    const workload = getStaffWorkload(staff._id)
                    const isFull = workload?.isAtCapacity
                    const isCurrentAssignee = currentAssignedStaffId === String(staff._id)
                    return (
                      <SelectItem
                        key={staff._id}
                        value={staff._id}
                        disabled={isFull || isCurrentAssignee}
                      >
                        {formatStaffWorkloadLabel(staff.name, workload)}
                        {isCurrentAssignee ? " (Already assigned)" : isFull ? " (Full)" : ""}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {isSameStaffAssignment && (
                <p className="text-sm font-medium text-destructive">
                  This order is already assigned to this staff member. Please choose someone else.
                </p>
              )}
              {selectedStaffWorkload && !selectedStaffWorkload.isAtCapacity && (
                <StaffCapacityDetails
                  workload={selectedStaffWorkload}
                  dateLabel={
                    assigningOrder?.pickupDate
                      ? formatDate(assigningOrder.pickupDate)
                      : todayDateLabel
                  }
                />
              )}
              {selectedStaffWorkload?.isAtCapacity && (
                <p className="text-sm font-medium text-destructive">
                  {selectedStaffWorkload.name} is at full capacity (
                  {selectedStaffWorkload.assignedCount}/{selectedStaffWorkload.dailyCapacity} assigned,{" "}
                  {getStaffRemainingCapacity(selectedStaffWorkload)} remaining) and cannot take more orders.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModals}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={
                  assignStaffId === ASSIGN_STAFF_PLACEHOLDER ||
                  isSameStaffAssignment ||
                  (assignStaffId !== UNASSIGNED_STAFF_VALUE && isStaffAtCapacity(selectedStaffWorkload))
                }
              >
                Assign Staff
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={!!messageModal} onOpenChange={() => closeModals()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {messageModal?.mode === "all" ? "Message All Customers" : "Send Customer Message"}
            </DialogTitle>
            <DialogDescription>
              {messageModal?.mode === "single"
                ? messageModal.order?.userId?.name
                : messageModal?.mode === "customer"
                  ? "Choose a customer and send an in-app message"
                  : "Broadcast an in-app message to all customers"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendMessage} className="space-y-4">
            {messageModal?.mode === "customer" && (
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer._id} value={customer._id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={5}
                placeholder="Type your message to customers..."
              />
              <p className="text-xs text-muted-foreground">
                Messages are delivered as in-app notifications.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModals}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Send Message
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={!!deleteOrderId} onOpenChange={() => setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showCreateOrderModal && (
        <NewOrder
          isModal
          onCancel={() => setShowCreateOrderModal(false)}
          onSuccess={async () => {
            setShowCreateOrderModal(false)
            await fetchOrders(user?.role === "client" ? { userId: user._id } : {})
          }}
        />
      )}
    </div>
  )
}
