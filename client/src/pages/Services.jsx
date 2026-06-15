import { useEffect, useMemo, useState } from "react"
import { Plus, Pencil, Trash2, Shirt, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { categoryAPI, serviceAPI } from "@/services/api"
import PageHeader from "@/components/shared/PageHeader"
import StatCard from "@/components/shared/StatCard"
import { EmptyState } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { formatCurrency } from "@/lib/utils"
import { motion } from "framer-motion"

const initialFormState = {
  name: "",
  category: "",
  washPrice: "0",
  ironPrice: "0",
  dryCleanPrice: "0",
  status: "active",
}

export default function Services() {
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [editingService, setEditingService] = useState(null)
  const [formData, setFormData] = useState(initialFormState)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [servicesResponse, categoriesResponse] = await Promise.all([
          serviceAPI.getAll(),
          categoryAPI.getAll({ activeOnly: true }),
        ])
        const nextCategories = categoriesResponse.data?.categories || []
        setServices(servicesResponse.data?.services || [])
        setCategories(nextCategories)
        setFormData((prev) => ({ ...prev, category: prev.category || nextCategories[0]?.name || "" }))
      } catch {
        toast.error("Failed to load services")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredServices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return services.filter(
      (service) =>
        !query ||
        service.name.toLowerCase().includes(query) ||
        service.category.toLowerCase().includes(query)
    )
  }, [services, searchTerm])

  const stats = useMemo(() => {
    const activeCount = services.filter((s) => s.status === "active").length
    return { total: services.length, active: activeCount }
  }, [services])

  const closeModal = () => {
    setShowModal(false)
    setEditingService(null)
    setFormData({ ...initialFormState, category: categories[0]?.name || "" })
  }

  const openModal = (service = null) => {
    if (service) {
      setEditingService(service)
      setFormData({
        name: service.name,
        category: service.category,
        washPrice: String(service.washPrice ?? 0),
        ironPrice: String(service.ironPrice ?? 0),
        dryCleanPrice: String(service.dryCleanPrice ?? 0),
        status: service.status,
      })
    } else {
      setEditingService(null)
      setFormData({ ...initialFormState, category: categories[0]?.name || "" })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.category.trim()) {
      toast.error("Please complete the service name and category")
      return
    }

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      washPrice: Number(formData.washPrice || 0),
      ironPrice: Number(formData.ironPrice || 0),
      dryCleanPrice: Number(formData.dryCleanPrice || 0),
      status: formData.status,
    }

    setSubmitting(true)
    try {
      if (editingService) {
        const response = await serviceAPI.update(editingService._id, payload)
        setServices((prev) => prev.map((s) => (s._id === editingService._id ? response.data.service : s)))
        toast.success("Service updated successfully")
      } else {
        const response = await serviceAPI.create(payload)
        setServices((prev) => [response.data.service, ...prev])
        toast.success("Service created successfully")
      }
      closeModal()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save service")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await serviceAPI.delete(deleteId)
      setServices((prev) => prev.filter((s) => s._id !== deleteId))
      toast.success("Service deleted successfully")
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete service")
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Services"
        description="Manage laundry services, pricing, and availability."
        icon={Sparkles}
        action={
          <Button onClick={() => openModal()}>
            <Plus className="mr-2 h-4 w-4" />Add Service
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Shirt} label="Total Services" value={stats.total} loading={loading} />
        <StatCard icon={Sparkles} label="Active Services" value={stats.active} loading={loading} />
        <StatCard icon={Shirt} label="Categories" value={categories.length} loading={loading} />
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-[16px]" />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title="No services found"
          description="Create your first laundry service to get started."
          actionLabel="Add Service"
          onAction={() => openModal()}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service, index) => (
            <motion.div
              key={service._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group overflow-hidden transition-shadow hover:shadow-elevated">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-primary/10">
                      <Shirt className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant={service.status === "active" ? "success" : "secondary"}>
                      {service.status}
                    </Badge>
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{service.name}</h3>
                  <p className="text-sm font-medium text-muted-foreground">{service.category}</p>
                  <div className="mt-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wash</span>
                      <span className="font-semibold">{formatCurrency(service.washPrice || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Iron</span>
                      <span className="font-semibold">{formatCurrency(service.ironPrice || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dry Clean</span>
                      <span className="font-semibold">{formatCurrency(service.dryCleanPrice || 0)}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openModal(service)}>
                      <Pencil className="mr-1 h-3 w-3" />Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteId(service._id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Create Service"}</DialogTitle>
            <DialogDescription>Configure laundry item pricing and availability.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["washPrice", "ironPrice", "dryCleanPrice"].map((field) => (
                <div key={field} className="space-y-2">
                  <Label className="capitalize">{field.replace("Price", " Price")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData[field]}
                    onChange={(e) => setFormData((p) => ({ ...p, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
              <Button type="submit" loading={submitting} disabled={categories.length === 0}>
                {editingService ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
