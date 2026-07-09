import { useCallback, useEffect, useMemo, useState } from "react"
import {
  FileText,
  Download,
  Printer,
  Eye,
  Search,
  CalendarDays,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { paymentAPI } from "@/services/api"
import { useAuth } from "@/context/AuthContext"
import PageHeader from "@/components/shared/PageHeader"
import DataTable from "@/components/shared/DataTable"
import { PaymentStatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatDate, formatDateTime, toDateInputValue } from "@/lib/utils"

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "partially_paid", label: "Partial Paid" },
  { value: "unpaid", label: "Not Paid" },
]

const getDefaultDateRange = () => {
  const end = new Date()
  const start = new Date()
  start.setMonth(end.getMonth() - 1)
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  }
}

const escapeCsvValue = (value) => {
  const stringValue = String(value ?? "")
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

export default function Invoices() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dateRange, setDateRange] = useState(getDefaultDateRange)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchTerm])

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }
      if (statusFilter !== "all") params.status = statusFilter
      if (debouncedSearch) params.search = debouncedSearch

      const response = await paymentAPI.getInvoices(params)
      setInvoices(response.data?.invoices || [])
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load invoices")
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [dateRange.endDate, dateRange.startDate, debouncedSearch, statusFilter])

  useEffect(() => {
    if (user) loadInvoices()
  }, [user, loadInvoices])

  const openInvoice = (row) => {
    setSelectedInvoice(row)
  }

  const handlePrint = (row) => {
    openInvoice(row)
    window.setTimeout(() => window.print(), 300)
  }

  const handleDownloadPdf = (row) => {
    openInvoice(row)
    toast.info("Use the print dialog and choose Save as PDF")
    window.setTimeout(() => window.print(), 300)
  }

  const handleMarkAsPaid = async (row) => {
    if (row.status === "paid") {
      toast.info("Invoice is already paid")
      return
    }

    if (row.dueAmount <= 0) {
      toast.info("Nothing due on this invoice")
      return
    }

    setActionLoadingId(row.id)
    try {
      await paymentAPI.create({
        orderId: row.orderId,
        clientId: row.clientId,
        customerName: row.customerName,
        phoneNumber: row.customerPhone,
        totalAmount: row.totalAmount,
        amountPaid: row.dueAmount,
        discount: row.discount || 0,
        paymentMethod: "cash",
        paymentDate: new Date().toISOString().split("T")[0],
      })
      toast.success("Invoice marked as paid")
      await loadInvoices()
      if (selectedInvoice?.id === row.id) {
        setSelectedInvoice(null)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark invoice as paid")
    } finally {
      setActionLoadingId(null)
    }
  }

  const exportRows = useMemo(
    () =>
      invoices.map((row) => ({
        invoiceNumber: row.invoiceNumber,
        orderNumber: row.orderNumber,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        totalAmount: row.totalAmount,
        paidAmount: row.paidAmount,
        dueAmount: row.dueAmount,
        status: row.status,
        createdAt: formatDateTime(row.createdAt),
      })),
    [invoices]
  )

  const exportExcel = () => {
    if (!exportRows.length) {
      toast.error("No invoices to export")
      return
    }

    const headers = [
      "Invoice Number",
      "Order ID",
      "Customer Name",
      "Customer Phone",
      "Total Amount",
      "Paid Amount",
      "Due Amount",
      "Status",
      "Date & Time",
    ]
    const rows = exportRows.map((row) => [
      row.invoiceNumber,
      row.orderNumber,
      row.customerName,
      row.customerPhone,
      row.totalAmount,
      row.paidAmount,
      row.dueAmount,
      row.status,
      row.createdAt,
    ])
    const csv = [headers, ...rows]
      .map((line) => line.map(escapeCsvValue).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `invoices-${dateRange.startDate}-to-${dateRange.endDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Invoices exported to Excel")
  }

  const exportPdf = () => {
    if (!invoices.length) {
      toast.error("No invoices to export")
      return
    }
    toast.info("Use the print dialog and choose Save as PDF")
    window.print()
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: "Invoice #",
        cell: ({ row }) => <span className="font-semibold">{row.original.invoiceNumber}</span>,
      },
      {
        accessorKey: "orderNumber",
        header: "Order ID",
        cell: ({ row }) => <span className="font-medium">{row.original.orderNumber || "N/A"}</span>,
      },
      {
        accessorKey: "customerName",
        header: "Customer",
      },
      {
        accessorKey: "customerPhone",
        header: "Customer Phone",
        cell: ({ row }) => row.original.customerPhone || "N/A",
      },
      {
        accessorKey: "totalAmount",
        header: "Total",
        cell: ({ row }) => formatCurrency(row.original.totalAmount || 0),
      },
      {
        accessorKey: "paidAmount",
        header: "Paid Amount",
        cell: ({ row }) => (
          <span className="font-medium text-success">{formatCurrency(row.original.paidAmount || 0)}</span>
        ),
      },
      {
        accessorKey: "dueAmount",
        header: "Due Amount",
        cell: ({ row }) => (
          <span className={row.original.dueAmount > 0 ? "font-medium text-destructive" : "font-medium"}>
            {formatCurrency(row.original.dueAmount || 0)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: "Date & Time",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const invoiceRow = row.original
          const isBusy = actionLoadingId === invoiceRow.id

          return (
            <div className="flex flex-wrap items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="View"
                onClick={() => openInvoice(invoiceRow)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Print"
                onClick={() => handlePrint(invoiceRow)}
              >
                <Printer className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Download PDF"
                onClick={() => handleDownloadPdf(invoiceRow)}
              >
                <Download className="h-4 w-4" />
              </Button>
              {isAdmin && invoiceRow.status !== "paid" && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Mark as Paid"
                  disabled={isBusy}
                  onClick={() => handleMarkAsPaid(invoiceRow)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [actionLoadingId, isAdmin]
  )

  const selectedOrder = selectedInvoice?.order

  return (
    <div className="space-y-8">
      <PageHeader
        title="Invoices"
        description="Professional invoices with payment tracking and export tools."
        icon={FileText}
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportPdf}>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="h-auto flex-wrap">
                {STATUS_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search invoice #, order ID, customer, phone..."
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(event) =>
                    setDateRange((current) => ({ ...current, startDate: event.target.value }))
                  }
                  className="w-auto"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(event) =>
                    setDateRange((current) => ({ ...current, endDate: event.target.value }))
                  }
                  className="w-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={invoices}
        showSearch={false}
        loading={loading}
        emptyTitle="No invoices found"
        emptyDescription="Try adjusting your search, status filter, or date range."
      />

      <Sheet open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedInvoice && selectedOrder && (
            <div className="print-invoice space-y-6">
              <SheetHeader>
                <SheetTitle>Invoice Details</SheetTitle>
              </SheetHeader>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-primary text-lg font-bold text-white">
                    L
                  </div>
                  <p className="mt-2 text-lg font-bold">LaundryHub</p>
                  <p className="text-sm text-muted-foreground">Professional Laundry Services</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{selectedInvoice.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(selectedInvoice.createdAt)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Order: {selectedInvoice.orderNumber}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Bill To</p>
                <p className="font-semibold">{selectedInvoice.customerName}</p>
                <p className="text-sm text-muted-foreground">{selectedInvoice.customerEmail || "No email provided"}</p>
                <p className="text-sm text-muted-foreground">{selectedInvoice.customerPhone || "No phone provided"}</p>
              </div>

              <div className="rounded-[10px] border border-border">
                <div className="grid grid-cols-4 gap-2 border-b border-border bg-muted/40 p-3 text-xs font-semibold uppercase text-muted-foreground">
                  <span className="col-span-2">Item</span>
                  <span>Qty</span>
                  <span className="text-right">Price</span>
                </div>
                {selectedOrder.items?.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-4 gap-2 border-b border-border p-3 text-sm last:border-0"
                  >
                    <span className="col-span-2 font-medium">{item.serviceName || item.itemType}</span>
                    <span>{item.quantity}</span>
                    <span className="text-right">{formatCurrency(item.price || 0)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedInvoice.totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>{formatCurrency(selectedInvoice.discount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid Amount</span>
                  <span className="font-medium text-success">{formatCurrency(selectedInvoice.paidAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Amount</span>
                  <span className="font-medium text-destructive">{formatCurrency(selectedInvoice.dueAmount || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedInvoice.totalAmount || 0)}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <PaymentStatusBadge status={selectedInvoice.status} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button size="sm" onClick={() => handleDownloadPdf(selectedInvoice)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                  {isAdmin && selectedInvoice.status !== "paid" && (
                    <Button
                      size="sm"
                      disabled={actionLoadingId === selectedInvoice.id}
                      onClick={() => handleMarkAsPaid(selectedInvoice)}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark as Paid
                    </Button>
                  )}
                </div>
              </div>

              {selectedInvoice.dueDate && (
                <p className="text-xs text-muted-foreground">
                  Due date: {formatDate(selectedInvoice.dueDate)}
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
