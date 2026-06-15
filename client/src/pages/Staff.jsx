import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Briefcase,
  UserCog,
  CalendarClock,
  Edit2,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { api, orderAPI, userAPI } from "@/services/api"
import PageHeader from "@/components/shared/PageHeader"
import DataTable from "@/components/shared/DataTable"
import StatCard from "@/components/shared/StatCard"
import StatusBadge from "@/components/shared/StatusBadge"
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
import { getInitials } from "@/lib/utils"

const availabilityVariant = (availability) => {
  if (availability === "Available") return "default"
  if (availability === "At Capacity") return "destructive"
  return "secondary"
}

export default function Staff() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [staffMembers, setStaffMembers] = useState([])
  const [orders, setOrders] = useState([])
  const [todayWorkloads, setTodayWorkloads] = useState([])
  const [loading, setLoading] = useState(true)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [savingStaff, setSavingStaff] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [deleteStaffId, setDeleteStaffId] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [staffFormData, setStaffFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    dailyCapacity: "10",
  })

  const isAdmin = user?.role === "admin"

  const reloadStaffData = async () => {
    try {
      setLoading(true)
      const [staffResponse, ordersResponse, workloadResponse] = await Promise.all([
        userAPI.getStaff(),
        orderAPI.getAll(),
        userAPI.getStaffWorkload({ date: new Date().toISOString().split("T")[0] }),
      ])
      setStaffMembers(staffResponse.data?.staffMembers || [])
      setOrders(ordersResponse.data?.orders || [])
      setTodayWorkloads(workloadResponse.data?.workloads || [])
    } catch {
      toast.error("Failed to load staff overview")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) reloadStaffData()
  }, [isAdmin])

  const staffRows = useMemo(() => {
    const assignedOrdersByStaff = orders.reduce((acc, order) => {
      const staffId = order.assignedStaff?._id
      if (!staffId) return acc
      if (!acc[staffId]) acc[staffId] = []
      acc[staffId].push(order)
      return acc
    }, {})

    return staffMembers.map((member) => {
      const assignedOrders = assignedOrdersByStaff[member._id] || []
      const activeAssignments = assignedOrders.filter((o) => o.status !== "delivered")
      const completedAssignments = assignedOrders.filter((o) => o.status === "delivered")
      const todayWorkload = todayWorkloads.find((entry) => entry.staffId === String(member._id))
      const dailyCapacity = todayWorkload?.dailyCapacity ?? member.dailyCapacity ?? 10
      const todayAssigned = todayWorkload?.assignedCount ?? 0
      return {
        id: member._id,
        member,
        name: member.name || "Unnamed Staff",
        email: member.email || "",
        phone: member.phone || "N/A",
        address: member.address?.trim() || "No address provided",
        availability: todayWorkload?.isAtCapacity
          ? "At Capacity"
          : activeAssignments.length > 0
            ? "Assigned"
            : "Available",
        activeCount: activeAssignments.length,
        completedCount: completedAssignments.length,
        totalAssigned: assignedOrders.length,
        dailyCapacity,
        todayAssigned,
        todayWorkloadLabel: `${todayAssigned}/${dailyCapacity}`,
        remainingToday: todayWorkload?.remainingCapacity ?? Math.max(0, dailyCapacity - todayAssigned),
        isActive: member.isActive !== false,
      }
    })
  }, [orders, staffMembers, todayWorkloads])

  const stats = useMemo(() => {
    const activeStaff = staffMembers.filter((m) => m.isActive !== false).length
    const openAssigned = orders.filter((o) => o.assignedStaff?._id && o.status !== "delivered").length
    const shiftsCovered = staffMembers.length === 0 ? 0 : Math.round((activeStaff / staffMembers.length) * 100)
    return { activeStaff, total: staffMembers.length, openAssigned, shiftsCovered }
  }, [orders, staffMembers])

  const handleCloseModal = () => {
    setShowStaffModal(false)
    setEditingStaff(null)
    setStaffFormData({ name: "", email: "", phone: "", address: "", dailyCapacity: "10" })
  }

  const handleCreateStaff = async (e) => {
    e.preventDefault()
    if (!staffFormData.name || !staffFormData.email) {
      toast.error("Please fill in name and email")
      return
    }
    setSavingStaff(true)
    try {
      if (editingStaff) {
        await userAPI.update(editingStaff.id, {
          ...staffFormData,
          dailyCapacity: Number(staffFormData.dailyCapacity) || 10,
        })
        toast.success("Staff member updated successfully")
      } else {
        await api.post("/users", {
          ...staffFormData,
          role: "staff",
          password: "temp_password_123",
          dailyCapacity: Number(staffFormData.dailyCapacity) || 10,
        })
        toast.success("Staff member created successfully")
      }
      handleCloseModal()
      await reloadStaffData()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save staff member")
    } finally {
      setSavingStaff(false)
    }
  }

  const handleEditStaff = (staff) => {
    setEditingStaff(staff)
    setStaffFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone === "N/A" ? "" : staff.phone,
      address: staff.address === "No address provided" ? "" : staff.address,
      dailyCapacity: String(staff.dailyCapacity ?? 10),
    })
    setShowStaffModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteStaffId) return
    try {
      await userAPI.delete(deleteStaffId)
      toast.success("Staff member deleted successfully")
      if (selectedStaff?.id === deleteStaffId) setSelectedStaff(null)
      await reloadStaffData()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete staff member")
    } finally {
      setDeleteStaffId(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Staff",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(row.original.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{row.original.name}</p>
              <p className="text-xs text-muted-foreground">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      { accessorKey: "phone", header: "Phone" },
      {
        accessorKey: "availability",
        header: "Availability",
        cell: ({ row }) => (
          <Badge variant={availabilityVariant(row.original.availability)}>
            {row.original.availability}
          </Badge>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => (row.isActive ? "active" : "inactive"),
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.isActive ? "active" : "inactive"} />
        ),
      },
      {
        accessorKey: "todayWorkloadLabel",
        header: "Today",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.todayWorkloadLabel}</span>
        ),
      },
      { accessorKey: "activeCount", header: "Active" },
      { accessorKey: "completedCount", header: "Completed" },
      { accessorKey: "dailyCapacity", header: "Daily Limit" },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedStaff(row.original)}>
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditStaff(row.original)}>
                <Edit2 className="mr-2 h-4 w-4" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteStaffId(row.original.id)}
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

  if (!isAdmin) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <h2 className="mb-2 text-xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground">You don&apos;t have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Staff Management"
        description="Manage workforce availability and team assignments."
        icon={Briefcase}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/orders")}>
              <CalendarClock className="mr-2 h-4 w-4" />Assign Orders
            </Button>
            <Button onClick={() => setShowStaffModal(true)}>
              <UserCog className="mr-2 h-4 w-4" />Add Staff
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Staff" value={stats.activeStaff} icon={Briefcase} loading={loading} />
        <StatCard label="Shifts Covered" value={`${stats.shiftsCovered}%`} icon={CalendarClock} loading={loading} />
        <StatCard label="Open Assignments" value={stats.openAssigned} icon={Clock} loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={staffRows}
        searchKey="name"
        searchPlaceholder="Search staff..."
        loading={loading}
        emptyTitle="No staff members found"
        emptyDescription="Add staff to get started."
      />

      <Sheet open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedStaff && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                      {getInitials(selectedStaff.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle>{selectedStaff.name}</SheetTitle>
                    <SheetDescription>
                      <Badge variant={availabilityVariant(selectedStaff.availability)} className="mt-1">
                        {selectedStaff.availability}
                      </Badge>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase">Today</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{selectedStaff.todayWorkloadLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedStaff.remainingToday} slot{selectedStaff.remainingToday === 1 ? "" : "s"} left
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase">Active</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{selectedStaff.activeCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase">Completed</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{selectedStaff.completedCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase">Daily Limit</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{selectedStaff.dailyCapacity}</p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {selectedStaff.email}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {selectedStaff.phone}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {selectedStaff.address}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <StatusBadge status={selectedStaff.isActive ? "active" : "inactive"} />
                  <span className="text-muted-foreground">
                    {selectedStaff.totalAssigned} total assigned order{selectedStaff.totalAssigned === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={showStaffModal} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? "Update staff account details." : "Create a new staff account."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateStaff} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={staffFormData.name}
                onChange={(e) => setStaffFormData((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={staffFormData.email}
                onChange={(e) => setStaffFormData((p) => ({ ...p, email: e.target.value.trim().toLowerCase() }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={staffFormData.phone}
                  onChange={(e) => setStaffFormData((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Daily Order Capacity</Label>
                <Input
                  type="number"
                  min={1}
                  value={staffFormData.dailyCapacity}
                  onChange={(e) => setStaffFormData((p) => ({ ...p, dailyCapacity: e.target.value }))}
                  placeholder="10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={staffFormData.address}
                onChange={(e) => setStaffFormData((p) => ({ ...p, address: e.target.value }))}
              />
            </div>
            {!editingStaff && (
              <p className="rounded-[10px] bg-muted/50 p-3 text-sm text-muted-foreground">
                Temporary password: <span className="font-semibold">temp_password_123</span>
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit" loading={savingStaff}>
                {editingStaff ? "Update Staff" : "Create Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteStaffId} onOpenChange={() => setDeleteStaffId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this staff member? This action cannot be undone.
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
