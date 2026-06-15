import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import {
  Plus,
  Edit2,
  Trash2,
  Mail,
  Phone,
  ShieldCheck,
  Users2,
  MoreHorizontal,
  Lock,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/services/api"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate, getInitials } from "@/lib/utils"

const permissionMeta = {
  admin: { label: "Full Access", icon: Lock },
  staff: { label: "Partial Access", icon: ShieldCheck },
}

export default function Users() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [roleFilter, setRoleFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteUserId, setDeleteUserId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", role: "staff" })

  const isAdmin = currentUser?.role === "admin"

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get("/users")
      setUsers(response.data?.users || [])
    } catch {
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) fetchUsers()
  }, [isAdmin])

  const teamUsers = useMemo(
    () => users.filter((u) => u.role === "admin" || u.role === "staff"),
    [users]
  )

  const filteredUsers = useMemo(() => {
    if (roleFilter === "all") return teamUsers
    return teamUsers.filter((u) => u.role === roleFilter)
  }, [teamUsers, roleFilter])

  const stats = useMemo(() => {
    const admins = teamUsers.filter((u) => u.role === "admin").length
    const staff = teamUsers.filter((u) => u.role === "staff").length
    const active = teamUsers.filter((u) => u.isActive !== false).length
    return { total: teamUsers.length, admins, staff, active }
  }, [teamUsers])

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user)
      setFormData({ name: user.name, email: user.email, phone: user.phone || "", role: user.role })
    } else {
      setEditingUser(null)
      setFormData({ name: "", email: "", phone: "", role: "staff" })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingUser(null)
    setFormData({ name: "", email: "", phone: "", role: "staff" })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      toast.error("Please fill in all required fields")
      return
    }
    const normalizedEmail = formData.email.trim().toLowerCase()
    const emailTaken = users.some(
      (u) => u.email?.toLowerCase() === normalizedEmail && u._id !== editingUser?._id
    )
    if (emailTaken) {
      toast.error("Email already in use")
      return
    }
    setSubmitting(true)
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, { ...formData, email: normalizedEmail })
        toast.success("User updated successfully")
      } else {
        await api.post("/users", { ...formData, email: normalizedEmail, password: "temp_password_123" })
        toast.success("User created successfully")
      }
      handleCloseModal()
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save user")
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteUserId) return
    try {
      await api.delete(`/users/${deleteUserId}`)
      toast.success("User deleted successfully")
      fetchUsers()
    } catch {
      toast.error("Failed to delete user")
    } finally {
      setDeleteUserId(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "User",
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
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <Badge variant={row.original.role === "admin" ? "default" : "secondary"}>
            {row.original.role.charAt(0).toUpperCase() + row.original.role.slice(1)}
          </Badge>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => (row.isActive !== false ? "active" : "inactive"),
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.isActive !== false ? "active" : "inactive"} />
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date Added",
        cell: ({ row }) => formatDate(row.original.createdAt || new Date()),
      },
      {
        id: "permissions",
        accessorFn: (row) => permissionMeta[row.role]?.label || "Partial Access",
        header: "Permissions",
      },
      {
        id: "contact",
        header: "Contact",
        cell: ({ row }) => (
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{row.original.email}</div>
            <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{row.original.phone || "N/A"}</div>
                  </div>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleOpenModal(row.original)}>
                <Edit2 className="mr-2 h-4 w-4" />Edit
              </DropdownMenuItem>
              {row.original._id !== currentUser?._id && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteUserId(row.original._id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [currentUser?._id]
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
        title="User Management"
        description="Manage enterprise permissions and staff access."
        icon={Users2}
        action={
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />Add New User
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Users" value={stats.total} icon={Users2} loading={loading} />
        <StatCard label="Admins" value={stats.admins} icon={ShieldCheck} loading={loading} />
        <StatCard label="Staff" value={stats.staff} icon={Users2} loading={loading} />
      </div>

      <Tabs value={roleFilter} onValueChange={setRoleFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="admin">Admins</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={filteredUsers}
        searchKey="name"
        searchPlaceholder="Search users..."
        loading={loading}
        emptyTitle="No users found"
        emptyDescription="Add admin or staff accounts to get started."
      />

      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update user details." : "Create a new account and assign access level."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                    value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                    type="email"
                    value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value.trim().toLowerCase() }))}
                    required
                  />
                </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                      value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData((p) => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                  </div>
                </div>
            {!editingUser && (
              <p className="rounded-[10px] bg-muted/50 p-3 text-sm text-muted-foreground">
                Temporary password: <span className="font-semibold">temp_password_123</span>
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit" loading={submitting}>
                {editingUser ? "Update User" : "Create User"}
                  </Button>
            </DialogFooter>
              </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
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
