import { useEffect, useMemo, useState } from "react"
import { FolderOpen, Plus, Edit2, Trash2, Power } from "lucide-react"
import { toast } from "sonner"
import { expenseCategoryAPI } from "@/services/api"
import DataTable from "@/components/shared/DataTable"
import StatusBadge from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

const initialForm = { name: "", description: "", status: "active" }

export default function ExpenseCategoriesSettings() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState(initialForm)

  const loadCategories = async () => {
    setLoading(true)
    try {
      const response = await expenseCategoryAPI.getAll()
      setCategories(response.data?.categories || [])
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load expense categories")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
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

  const openEdit = (category) => {
    setEditingId(category._id)
    setForm({
      name: category.name || "",
      description: category.description || "",
      status: category.status || "active",
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
    }

    if (!payload.name) {
      toast.error("Category name is required")
      return
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await expenseCategoryAPI.update(editingId, payload)
        toast.success("Expense category updated")
      } else {
        await expenseCategoryAPI.create(payload)
        toast.success("Expense category created")
      }
      closeModal()
      await loadCategories()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save category")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (category) => {
    try {
      await expenseCategoryAPI.update(category._id, {
        name: category.name,
        description: category.description || "",
        status: category.status === "active" ? "inactive" : "active",
      })
      toast.success(
        category.status === "active" ? "Category deactivated" : "Category activated"
      )
      await loadCategories()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status")
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await expenseCategoryAPI.delete(deleteId)
      toast.success("Expense category deleted")
      await loadCategories()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete category")
    } finally {
      setDeleteId(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Category Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/10">
              <FolderOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{row.original.name}</p>
              <p className="text-xs text-muted-foreground">{row.original.slug}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="max-w-[280px] whitespace-normal text-sm text-muted-foreground">
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
          <h3 className="text-base font-bold">Expense Categories</h3>
          <p className="text-sm text-muted-foreground">
            Manage categories used when recording business expenses.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={categories}
        searchKey="name"
        searchPlaceholder="Search categories..."
        loading={loading}
        emptyTitle="No expense categories"
        emptyDescription="Add your first expense category to get started."
      />

      <Dialog open={showModal} onOpenChange={(open) => (!open ? closeModal() : setShowModal(true))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Category" : "Add Expense Category"}</DialogTitle>
            <DialogDescription>
              Categories appear in the Payments expense form dropdown.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Detergent"
                required
              />
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
                {editingId ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the category from Settings. Existing expense records keep their saved category value.
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
