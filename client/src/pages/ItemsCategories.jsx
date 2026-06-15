import { useEffect, useMemo, useState } from "react"
import { Tags, Plus, Edit2, Trash2, Layers, ClipboardList } from "lucide-react"
import { toast } from "sonner"
import { categoryAPI } from "@/services/api"
import PageHeader from "@/components/shared/PageHeader"
import StatCard from "@/components/shared/StatCard"
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

const initialFormState = { name: "", description: "", status: "active" }

export default function ItemsCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [deleteCategoryId, setDeleteCategoryId] = useState(null)
  const [categoryForm, setCategoryForm] = useState(initialFormState)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true)
        const response = await categoryAPI.getAll()
        setCategories(response.data?.categories || [])
      } catch {
        toast.error("Failed to load categories")
      } finally {
        setLoading(false)
      }
    }
    loadCategories()
  }, [])

  const stats = useMemo(() => {
    const active = categories.filter((c) => c.status === "active").length
    const review = categories.filter((c) => c.status === "review").length
    return { total: categories.length, active, review }
  }, [categories])

  const closeCategoryModal = () => {
    setShowCategoryModal(false)
    setEditingCategoryId(null)
    setCategoryForm(initialFormState)
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    const payload = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
      status: categoryForm.status,
    }
    if (!payload.name || !payload.description) {
      toast.error("Please complete all category fields")
      return
    }
    setSubmitting(true)
    try {
      if (editingCategoryId) {
        const response = await categoryAPI.update(editingCategoryId, payload)
        setCategories((prev) =>
          prev.map((c) => (c._id === editingCategoryId ? response.data.category : c))
        )
        toast.success("Category updated successfully")
      } else {
        const response = await categoryAPI.create(payload)
        setCategories((prev) => [response.data.category, ...prev])
        toast.success("Category added successfully")
      }
      closeCategoryModal()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save category")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditCategory = (category) => {
    setEditingCategoryId(category._id)
    setCategoryForm({
      name: category.name,
      description: category.description,
      status: category.status,
    })
    setShowCategoryModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteCategoryId) return
    try {
      await categoryAPI.delete(deleteCategoryId)
      setCategories((prev) => prev.filter((c) => c._id !== deleteCategoryId))
      toast.success("Category deleted successfully")
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete category")
    } finally {
      setDeleteCategoryId(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/10">
              <Tags className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="max-w-[260px] whitespace-normal text-sm text-muted-foreground">
            {row.original.description}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status === "active" ? "active" : "pending"} />
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleEditCategory(row.original)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteCategoryId(row.original._id)}
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
    <div className="space-y-8">
      <PageHeader
        title="Categories"
        description="Manage laundry categories with descriptions and statuses."
        icon={Tags}
        action={
          <Button
            onClick={() => {
              setEditingCategoryId(null)
              setCategoryForm(initialFormState)
              setShowCategoryModal(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />Add Category
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Categories" value={stats.total} icon={Tags} loading={loading} />
        <StatCard label="Active" value={stats.active} icon={Layers} loading={loading} />
        <StatCard label="Needs Review" value={stats.review} icon={ClipboardList} loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={categories}
        searchKey="name"
        searchPlaceholder="Search categories..."
        loading={loading}
        emptyTitle="No categories found"
        emptyDescription="Add categories to organize your services."
      />

      <Dialog open={showCategoryModal} onOpenChange={closeCategoryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategoryId ? "Edit Category" : "Add New Category"}</DialogTitle>
            <DialogDescription>
              {editingCategoryId ? "Update category details." : "Create a new laundry category."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={categoryForm.status}
                onValueChange={(v) => setCategoryForm((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCategoryModal}>Cancel</Button>
              <Button type="submit" loading={submitting}>
                {editingCategoryId ? "Update Category" : "Add Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
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
