import { useEffect, useMemo, useState } from "react"
import {
  Users,
  UserPlus,
  Download,
  Edit2,
  Trash2,
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  Wallet,
  ShoppingCart,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import { api, orderAPI, userAPI } from "@/services/api"
import PageHeader from "@/components/shared/PageHeader"
import DataTable from "@/components/shared/DataTable"
import StatCard from "@/components/shared/StatCard"
import StatusBadge, { PaymentStatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatCurrency, formatDate, getInitials, resolveCustomerPaymentStatus } from "@/lib/utils"

const tierVariant = (tier) => {
  if (tier === "VIP") return "default"
  if (tier === "Business") return "secondary"
  return "outline"
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [deleteCustomerId, setDeleteCustomerId] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerFormData, setCustomerFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  })

  const reloadCustomerData = async () => {
    try {
      setLoading(true)
      const [customersResponse, ordersResponse] = await Promise.all([
        userAPI.getAll({ role: "client" }),
        orderAPI.getAll(),
      ])
      setCustomers(customersResponse.data?.users || [])
      setOrders(ordersResponse.data?.orders || [])
    } catch {
      toast.error("Failed to load customers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadCustomerData()
  }, [])

  const customerRows = useMemo(() => {
    return customers.map((customer) => {
      const customerOrders = orders.filter((order) => order.userId?._id === customer._id)
      const totalSpent = customerOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
      const deliveredOrders = customerOrders.filter((order) => order.status === "delivered").length
      const location = customer.address?.trim() || "No address provided"
      const tier = customerOrders.length >= 10 ? "VIP" : customerOrders.length >= 4 ? "Business" : "Standard"

      const serviceCounts = customerOrders.reduce((acc, order) => {
        order.items?.forEach((item) => {
          const name = item.serviceName || item.itemType || "Other"
          acc[name] = (acc[name] || 0) + 1
        })
        return acc
      }, {})
      const favoriteService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"
      const paymentStatus = resolveCustomerPaymentStatus(customerOrders)
      const unpaidOrders = customerOrders.filter((order) => order.paymentStatus !== "paid").length

      return {
        id: customer._id,
        customer,
        name: customer.name || "Unnamed Customer",
        tier,
        status: customer.isActive !== false ? "active" : "inactive",
        paymentStatus,
        unpaidOrders,
        orders: customerOrders.length,
        totalSpent,
        location,
        email: customer.email || "N/A",
        phone: customer.phone || "N/A",
        deliveredOrders,
        favoriteService,
        recentOrders: customerOrders.slice(0, 5),
      }
    })
  }, [customers, orders])

  const stats = useMemo(() => {
    const activeCustomers = customers.filter((c) => c.isActive !== false).length
    const totalRevenue = customerRows.reduce((sum, c) => sum + c.totalSpent, 0)
    return { total: customers.length, active: activeCustomers, revenue: totalRevenue }
  }, [customers, customerRows])

  const closeCustomerModal = () => {
    setShowCustomerModal(false)
    setEditingCustomer(null)
    setCustomerFormData({ name: "", email: "", phone: "", address: "" })
  }

  const handleCreateCustomer = async (e) => {
    e.preventDefault()
    if (!customerFormData.name || !customerFormData.email) {
      toast.error("Please fill in name and email")
      return
    }
    setSavingCustomer(true)
    try {
      if (editingCustomer) {
        await userAPI.update(editingCustomer.id, customerFormData)
        toast.success("Customer updated successfully")
      } else {
        await api.post("/users", { ...customerFormData, role: "client", password: "temp_password_123" })
        toast.success("Customer created successfully")
      }
      closeCustomerModal()
      await reloadCustomerData()
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${editingCustomer ? "update" : "create"} customer`)
    } finally {
      setSavingCustomer(false)
    }
  }

  const handleEditCustomer = (row) => {
    setEditingCustomer(row)
    setCustomerFormData({
      name: row.name,
      email: row.email,
      phone: row.phone === "N/A" ? "" : row.phone,
      address: row.location === "No address provided" ? "" : row.location,
    })
    setShowCustomerModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteCustomerId) return
    try {
      await userAPI.delete(deleteCustomerId)
      toast.success("Customer deleted successfully")
      if (selectedCustomer?.id === deleteCustomerId) setSelectedCustomer(null)
      await reloadCustomerData()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete customer")
    } finally {
      setDeleteCustomerId(null)
    }
  }

  const handleExportCustomers = () => {
    if (!customerRows.length) {
      toast.error("No customers available to export")
      return
    }
    const header = ["Name", "Email", "Phone", "Address", "Tier", "Status", "Payment Status", "Orders", "Revenue"]
    const lines = customerRows.map((c) => [
      c.name, c.email, c.phone, c.location, c.tier, c.status, c.paymentStatus, c.orders, c.totalSpent.toFixed(2),
    ])
    const csv = [header, ...lines]
      .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "customers.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    toast.success("Customers exported successfully")
  }

  const columns = useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Customer",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(row.original.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{row.original.name}</p>
              <p className="text-xs text-muted-foreground">{row.original.location}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "tier",
        header: "Tier",
        cell: ({ row }) => <Badge variant={tierVariant(row.original.tier)}>{row.original.tier}</Badge>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "paymentStatus",
        header: "Payment",
        cell: ({ row }) => <PaymentStatusBadge status={row.original.paymentStatus} />,
      },
      { accessorKey: "orders", header: "Orders" },
      {
        accessorKey: "totalSpent",
        header: "Revenue",
        cell: ({ row }) => formatCurrency(row.original.totalSpent),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedCustomer(row.original)}>
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditCustomer(row.original)}>
                <Edit2 className="mr-2 h-4 w-4" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteCustomerId(row.original.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  )

  return (
    <div className="space-y-8">
      <PageHeader
        title="Customers"
        description="Track customer profiles, loyalty segments, and service history."
        icon={Users}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCustomers}>
              <Download className="mr-2 h-4 w-4" />Export
            </Button>
            <Button onClick={() => setShowCustomerModal(true)}>
              <UserPlus className="mr-2 h-4 w-4" />Add Customer
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Customers" value={stats.total} icon={Users} loading={loading} />
        <StatCard label="Active Accounts" value={stats.active} icon={UserPlus} loading={loading} />
        <StatCard label="Customer Revenue" value={formatCurrency(stats.revenue)} icon={Wallet} loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={customerRows}
        searchKey="name"
        searchPlaceholder="Search customers..."
        loading={loading}
        emptyTitle="No customers found"
        emptyDescription="Add customer accounts to get started."
      />

      {/* Customer Profile Sheet */}
      <Sheet open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedCustomer && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                      {getInitials(selectedCustomer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle>{selectedCustomer.name}</SheetTitle>
                    <SheetDescription>
                      <Badge variant={tierVariant(selectedCustomer.tier)} className="mt-1">
                        {selectedCustomer.tier}
                      </Badge>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ShoppingCart className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase">Orders</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{selectedCustomer.orders}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wallet className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase">Total Spent</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(selectedCustomer.totalSpent)}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-[10px] bg-muted/50 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Payment Status</p>
                <div className="mt-2 flex items-center gap-2">
                  <PaymentStatusBadge status={selectedCustomer.paymentStatus} />
                  {selectedCustomer.unpaidOrders > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {selectedCustomer.unpaidOrders} unpaid order{selectedCustomer.unpaidOrders === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-[10px] bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Favorite Service:</span>
                  <span>{selectedCustomer.favoriteService}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Contact</p>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />{selectedCustomer.email}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />{selectedCustomer.phone}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />{selectedCustomer.location}
                </div>
              </div>

              {selectedCustomer.recentOrders.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Recent Orders</p>
                    <div className="space-y-2">
                      {selectedCustomer.recentOrders.map((order) => (
                        <div key={order._id} className="flex items-center justify-between rounded-[10px] border border-border p-3">
                          <div>
                            <p className="text-sm font-semibold">{order.orderNumber}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <StatusBadge status={order.status} />
                              <PaymentStatusBadge status={order.paymentStatus || "pending"} />
                            </div>
                            <p className="mt-1 text-sm font-medium">{formatCurrency(order.totalAmount || 0)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create/Edit Dialog */}
      <Dialog open={showCustomerModal} onOpenChange={closeCustomerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? "Update customer account details." : "Create a new customer account."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={customerFormData.name}
                onChange={(e) => setCustomerFormData((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={customerFormData.email}
                onChange={(e) => setCustomerFormData((p) => ({ ...p, email: e.target.value.trim().toLowerCase() }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={customerFormData.phone}
                  onChange={(e) => setCustomerFormData((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={customerFormData.address}
                  onChange={(e) => setCustomerFormData((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
            </div>
            {!editingCustomer && (
              <p className="rounded-[10px] bg-muted/50 p-3 text-sm text-muted-foreground">
                New accounts use temporary password: <span className="font-semibold">temp_password_123</span>
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCustomerModal}>Cancel</Button>
              <Button type="submit" loading={savingCustomer}>
                {editingCustomer ? "Update Customer" : "Create Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCustomerId} onOpenChange={() => setDeleteCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone.
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
    </div>
  )
}
