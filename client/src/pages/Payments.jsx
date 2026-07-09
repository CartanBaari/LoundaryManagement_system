import { useEffect, useMemo, useState } from "react"
import { CreditCard, Plus, Wallet, TrendingUp, Receipt } from "lucide-react"
import { toast } from "sonner"
import { paymentAPI } from "@/services/api"
import { useAuth } from "@/context/AuthContext"
import PageHeader from "@/components/shared/PageHeader"
import DataTable from "@/components/shared/DataTable"
import StatCard from "@/components/shared/StatCard"
import { PaymentStatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { formatCurrency, formatDate } from "@/lib/utils"

const initialFormState = {
  clientId: "",
  orderId: "",
  customerName: "",
  phoneNumber: "",
  totalAmount: "",
  alreadyPaid: "",
  amountPaid: "",
  discount: "",
  paymentMethod: "cash",
  paymentDate: new Date().toISOString().split("T")[0],
  dueDate: "",
  notes: "",
}

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const methodLabelMap = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  bank: "Bank",
}

const statusLabelMap = { paid: "Paid", partial: "Partial", unpaid: "Unpaid" }

export default function Payments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [outstandingOptions, setOutstandingOptions] = useState([])
  const [paymentStats, setPaymentStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [outstandingLoading, setOutstandingLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [formData, setFormData] = useState(initialFormState)
  const isAdmin = user?.role === "admin"

  const loadOutstandingOptions = async () => {
    setOutstandingLoading(true)
    try {
      const response = await paymentAPI.getOutstanding()
      setOutstandingOptions(response.data?.options || [])
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load outstanding invoices")
      setOutstandingOptions([])
    } finally {
      setOutstandingLoading(false)
    }
  }

  const loadPaymentsPageData = async () => {
    setLoading(true)
    try {
      const requests = [paymentAPI.getAll(), paymentAPI.getStats()]
      const [paymentsResponse, statsResponse] = await Promise.all(requests)
      setPayments(paymentsResponse.data?.payments || [])
      setPaymentStats(statsResponse.data?.stats || null)
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load payments data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) loadPaymentsPageData()
  }, [user])

  const outstandingClients = useMemo(() => {
    const clientMap = new Map()
    outstandingOptions.forEach((option) => {
      const clientKey = option.clientId?.toString?.() || option.clientId
      if (!clientKey || clientMap.has(clientKey)) return
      clientMap.set(clientKey, {
        _id: clientKey,
        name: option.customerName,
        phone: option.phoneNumber,
      })
    })
    return Array.from(clientMap.values())
  }, [outstandingOptions])

  const filteredOutstandingOrders = useMemo(() => {
    if (!formData.clientId) return outstandingOptions
    return outstandingOptions.filter(
      (option) => (option.clientId?.toString?.() || option.clientId) === formData.clientId
    )
  }, [outstandingOptions, formData.clientId])

  const selectedOutstanding = useMemo(
    () => outstandingOptions.find((option) => option.orderId?.toString?.() === formData.orderId || option.orderId === formData.orderId) || null,
    [outstandingOptions, formData.orderId]
  )

  const invoiceNetTotal = useMemo(() => {
    const totalAmount = Math.max(0, toSafeNumber(formData.totalAmount, selectedOutstanding?.totalAmount || 0))
    const discount = Math.max(0, toSafeNumber(formData.discount, selectedOutstanding?.discount || 0))
    return Math.max(0, totalAmount - discount)
  }, [formData.totalAmount, formData.discount, selectedOutstanding])

  const currentRemaining = useMemo(() => {
    const alreadyPaid = Math.max(0, toSafeNumber(formData.alreadyPaid, selectedOutstanding?.alreadyPaid || 0))
    return Math.max(0, invoiceNetTotal - alreadyPaid)
  }, [formData.alreadyPaid, invoiceNetTotal, selectedOutstanding])

  const computedRemainingAfterPayment = useMemo(() => {
    const paymentAmount = Math.max(0, toSafeNumber(formData.amountPaid, 0))
    return Math.max(0, currentRemaining - paymentAmount)
  }, [currentRemaining, formData.amountPaid])

  const computedStatus = useMemo(() => {
    const alreadyPaid = Math.max(0, toSafeNumber(formData.alreadyPaid, selectedOutstanding?.alreadyPaid || 0))
    const paymentAmount = Math.max(0, toSafeNumber(formData.amountPaid, 0))
    const totalPaidAfter = alreadyPaid + paymentAmount

    if (totalPaidAfter <= 0) return "unpaid"
    if (totalPaidAfter >= invoiceNetTotal) return "paid"
    return "partial"
  }, [formData.alreadyPaid, formData.amountPaid, invoiceNetTotal, selectedOutstanding])

  const filteredPayments = useMemo(() => {
    let filtered = payments
    if (statusFilter === "paid") filtered = filtered.filter((p) => p.status === "paid")
    else if (statusFilter === "pending") filtered = filtered.filter((p) => p.status === "partial")
    else if (statusFilter === "unpaid") filtered = filtered.filter((p) => p.status === "unpaid")
    return filtered
  }, [payments, statusFilter])

  const paymentRows = useMemo(
    () =>
      filteredPayments.map((payment) => ({
        id: payment._id,
        paymentId: payment.paymentId,
        orderId: payment.orderId?.orderNumber || "N/A",
        customer: payment.customerName || payment.clientId?.name || "N/A",
        method: methodLabelMap[payment.paymentMethod] || payment.paymentMethod || "N/A",
        amountPaid: payment.amountPaid || 0,
        remainingBalance: payment.remainingBalance || 0,
        status: payment.status || "unpaid",
        paymentDate: payment.paymentDate,
      })),
    [filteredPayments]
  )

  const todayCollected = useMemo(() => {
    const todayDateString = new Date().toDateString()
    return payments
      .filter((p) => new Date(p.paymentDate).toDateString() === todayDateString)
      .reduce((sum, p) => sum + toSafeNumber(p.amountPaid, 0), 0)
  }, [payments])

  const totalOutstanding = useMemo(
    () => toSafeNumber(paymentStats?.totalOutstanding, 0),
    [paymentStats]
  )

  const successRate = useMemo(() => {
    if (!payments.length) return 0
    const paidCount = payments.filter((p) => p.status === "paid").length
    return Math.round((paidCount / payments.length) * 100)
  }, [payments])

  const resetForm = () => {
    setFormData({ ...initialFormState, paymentDate: new Date().toISOString().split("T")[0] })
  }

  const closeModal = () => {
    setShowRecordModal(false)
    resetForm()
  }

  const openModal = async () => {
    if (!isAdmin) {
      toast.error("Only admins can record payments")
      return
    }
    setShowRecordModal(true)
    resetForm()
    await loadOutstandingOptions()
  }

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleClientSelect = (selectedClientId) => {
    const selectedClient = outstandingClients.find((client) => client._id === selectedClientId)
    setFormData((prev) => ({
      ...prev,
      clientId: selectedClientId,
      orderId: "",
      customerName: selectedClient?.name || "",
      phoneNumber: selectedClient?.phone || "",
      totalAmount: "",
      alreadyPaid: "",
      amountPaid: "",
      discount: "",
      dueDate: "",
      notes: "",
    }))
  }

  const applyOutstandingOption = (option) => {
    if (!option) return

    setFormData((prev) => ({
      ...prev,
      orderId: option.orderId?.toString?.() || option.orderId,
      clientId: option.clientId?.toString?.() || option.clientId || prev.clientId,
      customerName: option.customerName || prev.customerName,
      phoneNumber: option.phoneNumber || prev.phoneNumber,
      totalAmount: String(toSafeNumber(option.totalAmount, 0)),
      alreadyPaid: String(toSafeNumber(option.alreadyPaid, 0)),
      discount: String(toSafeNumber(option.discount, 0)),
      amountPaid: "",
    }))
  }

  const handleOrderSelect = (selectedOrderId) => {
    const option = outstandingOptions.find(
      (entry) => entry.orderId?.toString?.() === selectedOrderId || entry.orderId === selectedOrderId
    )
    if (!option) {
      setFormData((prev) => ({ ...prev, orderId: "" }))
      return
    }
    applyOutstandingOption(option)
  }

  const handleSubmitPayment = async (e) => {
    e.preventDefault()
    if (!formData.orderId) {
      toast.error("Please select an order")
      return
    }
    if (!formData.clientId) {
      toast.error("Please select a client")
      return
    }

    const paymentAmount = Math.max(0, toSafeNumber(formData.amountPaid, 0))
    const discountAmount = Math.max(0, toSafeNumber(formData.discount, selectedOutstanding?.discount || 0))
    const totalAmount = Math.max(0, toSafeNumber(formData.totalAmount, selectedOutstanding?.totalAmount || 0))

    if (discountAmount > totalAmount) {
      toast.error("Discount cannot exceed the total amount")
      return
    }
    if (paymentAmount <= 0) {
      toast.error("Payment amount must be greater than zero")
      return
    }
    if (paymentAmount > currentRemaining) {
      toast.error(`Payment cannot exceed remaining balance (${formatCurrency(currentRemaining)})`)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        clientId: formData.clientId,
        orderId: formData.orderId,
        customerName: formData.customerName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        totalAmount,
        amountPaid: paymentAmount,
        discount: discountAmount,
        paymentMethod: formData.paymentMethod,
        paymentDate: formData.paymentDate,
        dueDate: formData.dueDate || undefined,
        status: computedStatus,
        notes: formData.notes.trim(),
      }
      const response = await paymentAPI.create(payload)
      toast.success(`Payment recorded (${response.data?.payment?.paymentId || "Saved"})`)
      closeModal()
      await loadPaymentsPageData()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record payment")
    } finally {
      setSubmitting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: "paymentId",
        header: "Payment ID",
        cell: ({ row }) => <span className="font-semibold">{row.original.paymentId}</span>,
      },
      { accessorKey: "orderId", header: "Order ID" },
      { accessorKey: "customer", header: "Customer" },
      {
        accessorKey: "method",
        header: "Method",
        cell: ({ row }) => <Badge variant="outline">{row.original.method}</Badge>,
      },
      {
        accessorKey: "amountPaid",
        header: "Amount Paid",
        cell: ({ row }) => formatCurrency(row.original.amountPaid),
      },
      {
        accessorKey: "remainingBalance",
        header: "Remaining",
        cell: ({ row }) => formatCurrency(row.original.remainingBalance),
      },
      {
        accessorKey: "paymentDate",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.paymentDate),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <PaymentStatusBadge status={statusLabelMap[row.original.status] || row.original.status} />
        ),
      },
    ],
    []
  )

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payments"
        description="Review collections, invoice status, and settlement methods."
        icon={CreditCard}
        action={
          isAdmin ? (
            <Button onClick={openModal}>
              <Plus className="mr-2 h-4 w-4" />Record Payment
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Collected Today" value={formatCurrency(todayCollected)} icon={Wallet} loading={loading} />
        <StatCard label="Outstanding" value={formatCurrency(totalOutstanding)} icon={CreditCard} loading={loading} />
        <StatCard label="Success Rate" value={`${successRate}%`} icon={TrendingUp} loading={loading} />
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="pending">Partial</TabsTrigger>
          <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={paymentRows}
        searchKey="customer"
        searchPlaceholder="Search payments..."
        loading={loading}
        emptyTitle="No payments found"
        emptyDescription="Record a payment to get started."
      />

      <Dialog open={showRecordModal} onOpenChange={closeModal}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Create a payment record with client details and settlement status.
            </DialogDescription>
          </DialogHeader>
          {outstandingLoading ? (
            <p className="py-8 text-center text-sm font-medium text-muted-foreground">Loading outstanding invoices...</p>
          ) : outstandingOptions.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-muted-foreground">No outstanding payments found.</p>
          ) : (
          <form onSubmit={handleSubmitPayment} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={formData.clientId} onValueChange={handleClientSelect}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {outstandingClients.map((client) => (
                        <SelectItem key={client._id} value={client._id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Order</Label>
                  <Select value={formData.orderId} onValueChange={handleOrderSelect} disabled={!formData.clientId}>
                    <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                    <SelectContent>
                      {filteredOutstandingOrders.map((option) => (
                        <SelectItem key={option.orderId} value={option.orderId?.toString?.() || option.orderId}>
                          {option.orderNumber} ({formatCurrency(option.remainingBalance)} remaining)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input
                    value={formData.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Payment Details</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Total Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.totalAmount}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Already Paid</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.alreadyPaid}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Remaining Balance</Label>
                  <Input value={currentRemaining.toFixed(2)} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    max={currentRemaining}
                    step="0.01"
                    value={formData.amountPaid}
                    onChange={(e) => handleInputChange("amountPaid", e.target.value)}
                    required
                    disabled={!formData.orderId}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <Input
                    type="number"
                    min="0"
                    max={Math.max(0, toSafeNumber(formData.totalAmount, selectedOutstanding?.totalAmount || 0))}
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => handleInputChange("discount", e.target.value)}
                    disabled={!formData.orderId}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Balance After Payment</Label>
                  <Input value={computedRemainingAfterPayment.toFixed(2)} readOnly className="bg-muted" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={formData.paymentMethod} onValueChange={(v) => handleInputChange("paymentMethod", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money (Hormuud / EVC Plus)</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Input value={statusLabelMap[computedStatus]} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => handleInputChange("paymentDate", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date (if debt)</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange("dueDate", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
                placeholder="Optional details..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
              <Button type="submit" loading={submitting} disabled={!formData.orderId}>
                <Receipt className="mr-2 h-4 w-4" />Record Payment
              </Button>
            </DialogFooter>
          </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
