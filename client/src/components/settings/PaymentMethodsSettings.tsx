import { useEffect, useMemo, useState } from "react"
import { CreditCard, Plus, Edit2, Trash2, Power } from "lucide-react"
import { toast } from "sonner"
import { paymentMethodAPI } from "@/services/api"
import DataTable from "@/components/shared/DataTable"
import StatusBadge from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

const initialForm = {
  name: "",
  type: "both",
  description: "",
  status: "active",
}

const typeLabel = {
  income: "Income",
  expense: "Expense",
  both: "Both",
}

export default function PaymentMethodsSettings() {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState(initialForm)

  const loadMethods = async () => {
    setLoading(true)
    try {
      const response = await paymentMethodAPI.getAll()
      setMethods(response.data?.methods || [])
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load payment methods")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMethods()
  }, [])

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(initialForm)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(initialForm)
    setShowModal(true)
  }

  const openEdit = (method) => {
    setEditingId(method._id)
    setForm({
      name: method.name || "",
      type: method.type || "both",
      description: method.description || "",
      status: method.status || "active",
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim(),
      status: form.status,
    }

    if (!payload.name) {
      toast.error("Method name is required")
      return
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await paymentMethodAPI.update(editingId, payload)
        toast.success("Payment method updated")
      } else {
        await paymentMethodAPI.create(payload)
        toast.success("Payment method created")
      }
      closeModal()
      await loadMethods()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save payment method")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (method) => {
    try {
      await paymentMethodAPI.update(method._id, {
        name: method.name,
        type: method.type,
        description: method.description || "",
        status: method.status === "active" ? "inactive" : "active",
      })
      toast.success(method.status === "active" ? "Method deactivated" : "Method activated")
      await loadMethods()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status")
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await paymentMethodAPI.delete(deleteId)
      toast.success("Payment method deleted")
      await loadMethods()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete payment method")
    } finally {
      setDeleteId(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Method Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/10">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{row.original.name}</p>
              <p className="text-xs text-muted-foreground">{row.original.slug}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline">{typeLabel[row.original.type] || row.original.type}</Badge>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="max-w-[260px] whitespace-normal text-sm text-muted-foreground">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status === "active" ? "active" : "inactive"} />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              title={row.original.status === "active" ? "Deactivate" : "Activate"}
              onClick={() => toggleStatus(row.original)}
            >
              <Power className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteId(row.original._id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold">Payment Methods</h3>
          <p className="text-sm text-muted-foreground">
            Manage methods available on Income and Expense payment forms.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Method
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={methods}
        searchKey="name"
        searchPlaceholder="Search payment methods..."
        loading={loading}
        emptyTitle="No payment methods"
        emptyDescription="Add your first payment method to get started."
      />

      <Dialog open={showModal} onOpenChange={(open) => (!open ? closeModal() : setShowModal(true))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle>
            <DialogDescription>
              Methods with type Income, Expense, or Both appear in the matching payment forms.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Method Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. EVC Plus"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                {editingId ? "Save Changes" : "Create Method"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment method?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the method from Settings. Existing transactions keep their saved method value.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-danger text-white hover:bg-danger/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
