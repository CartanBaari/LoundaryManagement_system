import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { AlertCircle, Plus, Trash2, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { api, serviceAPI, userAPI, orderAPI } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency, formatStaffWorkloadLabel, isStaffAtCapacity, getStaffRemainingCapacity } from "@/lib/utils"
import StaffCapacityDetails from "@/components/shared/StaffCapacityDetails"

const SERVICE_TYPE_OPTIONS = [
  { value: "wash", label: "Wash" },
  { value: "iron", label: "Iron" },
  { value: "dryClean", label: "Dry Clean" },
]

const formatServiceTypesLabel = (serviceTypes = []) => {
  if (!serviceTypes.length) return "Select service type"
  return SERVICE_TYPE_OPTIONS.filter((option) => serviceTypes.includes(option.value))
    .map((option) => option.label)
    .join(", ")
}

const addDaysToDateInput = (dateInput, days) => {
  const date = new Date(`${dateInput}T00:00:00`)
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getDateInputGapDays = (pickupDate, deliveryDate) => {
  const pickup = new Date(`${pickupDate}T00:00:00`)
  const delivery = new Date(`${deliveryDate}T00:00:00`)
  return Math.max(0, Math.round((delivery.getTime() - pickup.getTime()) / 86400000))
}

const formatDateLabel = (dateInput) =>
  new Date(`${dateInput}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

const NewOrder = ({ isModal = false, onSuccess, onCancel }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [loading, setLoading] = useState(false)
  const [dailyLimitStatus, setDailyLimitStatus] = useState({
    limit: 20,
    used: 0,
    remaining: 20,
    isFull: false,
  })
  const [customers, setCustomers] = useState([])
  const [staffMembers, setStaffMembers] = useState([])
  const [staffWorkloads, setStaffWorkloads] = useState([])
  const [serviceOptions, setServiceOptions] = useState([])
  const [items, setItems] = useState([
    { serviceId: "", itemType: "", serviceName: "", serviceTypes: ["wash"], quantity: 1, price: 0, category: "" },
  ])
  const [isUrgent, setIsUrgent] = useState(false)
  const [limitBlockedDate, setLimitBlockedDate] = useState(null)
  const [formData, setFormData] = useState({
    customerId: "",
    assignedStaff: "",
    paymentStatus: "pending",
    pickupDate: new Date().toISOString().split("T")[0],
    deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
  })

  useEffect(() => {
    let cancelled = false

    const syncPickupSchedule = async () => {
      if (!formData.pickupDate) return

      try {
        if (isUrgent) {
          const response = await orderAPI.getDailyLimitStatus({ date: formData.pickupDate })
          if (cancelled) return
          setDailyLimitStatus({
            limit: response.data?.dailyLimit ?? 20,
            used: response.data?.used ?? 0,
            remaining: response.data?.remaining ?? 0,
            isFull: Boolean(response.data?.isFull),
          })
          setLimitBlockedDate(null)
          return
        }

        const requestedPickup = formData.pickupDate
        const gapDays = getDateInputGapDays(formData.pickupDate, formData.deliveryDate)
        let pickup = requestedPickup

        for (let attempt = 0; attempt < 30; attempt += 1) {
          const response = await orderAPI.getDailyLimitStatus({ date: pickup })
          if (cancelled) return

          setDailyLimitStatus({
            limit: response.data?.dailyLimit ?? 20,
            used: response.data?.used ?? 0,
            remaining: response.data?.remaining ?? 0,
            isFull: Boolean(response.data?.isFull),
          })

          if (!response.data?.isFull) {
            const nextDelivery = addDaysToDateInput(pickup, gapDays)
            if (pickup !== formData.pickupDate || nextDelivery !== formData.deliveryDate) {
              setFormData((prev) => ({
                ...prev,
                pickupDate: pickup,
                deliveryDate: nextDelivery,
              }))
            }
            if (pickup !== requestedPickup) {
              setLimitBlockedDate(requestedPickup)
            }
            return
          }

          pickup = addDaysToDateInput(pickup, 1)
        }
      } catch {
        console.log("Could not fetch daily order limit")
      }
    }

    syncPickupSchedule()
    return () => {
      cancelled = true
    }
  }, [formData.pickupDate, isUrgent])

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await serviceAPI.getAll({ activeOnly: true })
        const nextServices = response.data?.services || []
        setServiceOptions(nextServices)
        if (nextServices.length > 0) {
          setItems([buildOrderItem(nextServices[0])])
        }
      } catch {
        toast.error("Failed to load available services")
      }
    }
    loadServices()
  }, [])

  useEffect(() => {
    const loadAdminOptions = async () => {
      if (!isAdmin) return
      try {
        const [customersResponse, staffResponse] = await Promise.all([
          userAPI.getAll({ role: "client" }),
          userAPI.getStaff(),
        ])
        setCustomers(customersResponse.data?.users || [])
        setStaffMembers(staffResponse.data?.staffMembers || [])
      } catch {
        toast.error("Failed to load customers and staff")
      }
    }
    loadAdminOptions()
  }, [isAdmin])

  useEffect(() => {
    const loadStaffWorkloads = async () => {
      if (!isAdmin || !formData.pickupDate) {
        setStaffWorkloads([])
        return
      }
      try {
        const response = await userAPI.getStaffWorkload({ date: formData.pickupDate })
        setStaffWorkloads(response.data?.workloads || [])
      } catch {
        setStaffWorkloads([])
      }
    }
    loadStaffWorkloads()
  }, [isAdmin, formData.pickupDate])

  const getStaffWorkload = (staffId) =>
    staffWorkloads.find((entry) => entry.staffId === String(staffId))

  useEffect(() => {
    if (!formData.assignedStaff) return
    const workload = staffWorkloads.find((entry) => entry.staffId === String(formData.assignedStaff))
    if (isStaffAtCapacity(workload)) {
      setFormData((prev) => ({ ...prev, assignedStaff: "" }))
    }
  }, [staffWorkloads, formData.assignedStaff])

  const selectedStaffWorkload = formData.assignedStaff
    ? getStaffWorkload(formData.assignedStaff)
    : null

  const getServicePrice = (service, serviceType) => {
    if (!service) return 0
    const priceMap = {
      wash: Number(service.washPrice || 0),
      iron: Number(service.ironPrice || 0),
      dryClean: Number(service.dryCleanPrice || 0),
    }
    return priceMap[serviceType] || 0
  }

  const calculateItemPrice = (service, serviceTypes = []) => {
    if (!service || !serviceTypes.length) return 0
    return serviceTypes.reduce((sum, serviceType) => sum + getServicePrice(service, serviceType), 0)
  }

  const buildOrderItem = (service, serviceTypes = ["wash"], quantity = 1) => ({
    serviceId: service?._id || "",
    itemType: service?.name || "",
    serviceName: service?.name || "",
    serviceTypes,
    quantity,
    price: calculateItemPrice(service, serviceTypes),
    category: service?.category || "",
  })

  const handleInputChange = (name, value) => {
    if (name === "pickupDate") {
      setLimitBlockedDate(null)
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        if (field === "serviceId") {
          const selectedService = serviceOptions.find((service) => service._id === value)
          return buildOrderItem(
            selectedService,
            item.serviceTypes?.length ? item.serviceTypes : ["wash"],
            item.quantity
          )
        }
        if (field === "quantity") {
          return { ...item, quantity: Math.max(1, parseInt(value, 10) || 1) }
        }
        return { ...item, [field]: value }
      })
    )
  }

  const addItem = () => {
    if (!serviceOptions.length) {
      toast.error("No active services available")
      return
    }
    setItems((prev) => [...prev, buildOrderItem(serviceOptions[0])])
  }

  const removeItem = (index) => {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const toggleServiceType = (index, serviceType) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item

        const selectedService = serviceOptions.find((service) => service._id === item.serviceId)
        const currentTypes = item.serviceTypes || []
        const nextTypes = currentTypes.includes(serviceType)
          ? currentTypes.filter((type) => type !== serviceType)
          : [...currentTypes, serviceType]

        const serviceTypes = nextTypes.length > 0 ? nextTypes : [serviceType]

        return {
          ...item,
          serviceTypes,
          price: calculateItemPrice(selectedService, serviceTypes),
        }
      })
    )
  }

  const expandItemsForSubmit = () =>
    items.flatMap((item) => {
      const selectedService = serviceOptions.find((service) => service._id === item.serviceId)
      return (item.serviceTypes || ["wash"]).map((serviceType) => ({
        serviceId: item.serviceId,
        itemType: item.itemType,
        serviceName: item.serviceName,
        category: item.category,
        serviceType,
        quantity: item.quantity,
        price: getServicePrice(selectedService, serviceType),
      }))
    })

  const calculateSubtotal = () => items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    return isUrgent ? subtotal * 2 : subtotal
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!serviceOptions.length) {
      toast.error("No active services available")
      return
    }
    if (items.length === 0) {
      toast.error("Please add at least one item")
      return
    }
    if (items.some((item) => !item.serviceId || !item.serviceTypes?.length)) {
      toast.error("Please choose a service and at least one service type for every item")
      return
    }
    if (isAdmin && !formData.customerId) {
      toast.error("Please select a customer")
      return
    }

    if (isAdmin && formData.assignedStaff) {
      const workload = getStaffWorkload(formData.assignedStaff)
      if (isStaffAtCapacity(workload)) {
        toast.error(
          workload
            ? `${workload.name} already has the maximum ${workload.dailyCapacity} orders on ${formData.pickupDate}`
            : "Selected staff member is at full capacity for this day"
        )
        return
      }
    }

    setLoading(true)
    try {
      const orderData = {
        items: expandItemsForSubmit(),
        pickupDate: formData.pickupDate,
        deliveryDate: formData.deliveryDate,
        deliveryNotes: formData.notes,
        isUrgent,
        ...(isAdmin ? { userId: formData.customerId } : {}),
        ...(isAdmin && formData.assignedStaff ? { assignedStaff: formData.assignedStaff } : {}),
        ...(isAdmin ? { paymentStatus: formData.paymentStatus } : {}),
      }
      const response = await api.post("/orders", orderData)
      toast.success(response?.data?.message || "Order created successfully")
      if (onSuccess) onSuccess()
      else navigate("/orders")
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create order")
    } finally {
      setLoading(false)
    }
  }

  const isLimitExceeded = !isUrgent && dailyLimitStatus.isFull
  const minDate = new Date().toISOString().split("T")[0]

  const handleCancel = () => {
    if (onCancel) onCancel()
    else navigate("/orders")
  }

  const formContent = (
    <div className="space-y-6">
      {limitBlockedDate && !isUrgent && (
        <div className="flex gap-3 rounded-[10px] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">Daily Limit Reached</h3>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              {dailyLimitStatus.used}/{dailyLimitStatus.limit} non-urgent orders are already scheduled for{" "}
              {formatDateLabel(limitBlockedDate)}. Received Date updated to {formatDateLabel(formData.pickupDate)}.
            </p>
          </div>
        </div>
      )}
      {isLimitExceeded && !limitBlockedDate && (
        <div className="flex gap-3 rounded-[10px] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">Daily Limit Reached</h3>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              {dailyLimitStatus.used}/{dailyLimitStatus.limit} non-urgent orders are already scheduled for this day.
              Finding the next available Received Date...
            </p>
          </div>
        </div>
      )}
      {isUrgent && dailyLimitStatus.isFull && (
        <div className="flex gap-3 rounded-[10px] border border-primary/20 bg-primary/5 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <h3 className="font-semibold">Urgent Order</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This urgent order will be placed today even though the daily limit ({dailyLimitStatus.limit}) is full.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {isAdmin && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={formData.customerId} onValueChange={(v) => handleInputChange("customerId", v)}>
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
            <div className="space-y-2">
              <Label>Assign Staff</Label>
              <Select value={formData.assignedStaff} onValueChange={(v) => handleInputChange("assignedStaff", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => {
                    const workload = getStaffWorkload(staff._id)
                    const isFull = workload?.isAtCapacity
                    return (
                      <SelectItem key={staff._id} value={staff._id} disabled={isFull}>
                        {formatStaffWorkloadLabel(staff.name, workload)}
                        {isFull ? " (Full)" : ""}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {selectedStaffWorkload && !selectedStaffWorkload.isAtCapacity && (
                <StaffCapacityDetails
                  workload={selectedStaffWorkload}
                  dateLabel={formData.pickupDate}
                  className="text-xs text-muted-foreground"
                />
              )}
              {selectedStaffWorkload?.isAtCapacity && (
                <p className="text-xs font-medium text-destructive">
                  {selectedStaffWorkload.name} is at full capacity (
                  {selectedStaffWorkload.assignedCount}/{selectedStaffWorkload.dailyCapacity} assigned,{" "}
                  {getStaffRemainingCapacity(selectedStaffWorkload)} remaining) on {formData.pickupDate}.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select
                value={formData.paymentStatus}
                onValueChange={(value) => handleInputChange("paymentStatus", value)}
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
          </div>
        )}

        <div>
          <h3 className="mb-4 text-base font-semibold">Items</h3>
          {!serviceOptions.length && (
            <div className="mb-4 rounded-[10px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No active services available. Ask an admin to add services in Services Management.
            </div>
          )}
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-4 rounded-[10px] border border-border p-4 md:grid-cols-[minmax(0,1.3fr)_150px_120px_120px_48px] md:items-end"
              >
                <div className="space-y-2">
                  <Label>Item</Label>
                  <Select
                    value={item.serviceId}
                    onValueChange={(v) => handleItemChange(index, "serviceId", v)}
                    disabled={!serviceOptions.length}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceOptions.map((service) => (
                        <SelectItem key={service._id} value={service._id}>
                          {service.name} ({service.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={!item.serviceId}>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 w-full justify-between rounded-[10px] border-border bg-card px-3 py-2 text-sm font-medium shadow-soft"
                      >
                        <span className="truncate text-left font-normal">
                          {formatServiceTypesLabel(item.serviceTypes)}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                      {SERVICE_TYPE_OPTIONS.map((option) => (
                        <DropdownMenuCheckboxItem
                          key={option.value}
                          checked={(item.serviceTypes || []).includes(option.value)}
                          onCheckedChange={() => toggleServiceType(index, option.value)}
                          onSelect={(event) => event.preventDefault()}
                        >
                          {option.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-2">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input type="number" value={item.price} disabled className="bg-muted" />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" onClick={addItem} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />Add Item
          </Button>
          <label className="mt-4 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm font-medium">Is Urgent</span>
          </label>
        </div>

        <div className="rounded-[10px] bg-muted/50 p-5">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Total Amount</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(calculateTotal())}</span>
          </div>
          {isUrgent && (
            <p className="mt-2 text-xs text-muted-foreground">
              Urgent order: {formatCurrency(calculateSubtotal())} x 2
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Received Date</Label>
            <Input
              type="date"
              value={formData.pickupDate}
              onChange={(e) => handleInputChange("pickupDate", e.target.value)}
              min={minDate}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Delivery Date</Label>
            <Input
              type="date"
              value={formData.deliveryDate}
              onChange={(e) => handleInputChange("deliveryDate", e.target.value)}
              min={minDate}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Special Instructions (Optional)</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            rows={3}
            placeholder="Add any special instructions..."
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" loading={loading} disabled={!serviceOptions.length}>
            Create Order
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )

  if (isModal) {
    return (
      <Dialog open onOpenChange={handleCancel}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
            <DialogDescription>Place a new laundry order</DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create New Order</h1>
        <p className="text-sm text-muted-foreground">Place a new laundry order</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
          <CardDescription>Fill in the form to create a new order</CardDescription>
        </CardHeader>
        <CardContent>{formContent}</CardContent>
      </Card>
    </div>
  )
}

export default NewOrder
