import { useEffect, useMemo, useState } from "react"
import { FileText, Download, Printer, Eye, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { orderAPI } from "@/services/api"
import PageHeader from "@/components/shared/PageHeader"
import DataTable from "@/components/shared/DataTable"
import StatusBadge, { PaymentStatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
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
import { formatCurrency, formatDate } from "@/lib/utils"

export default function Invoices() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await orderAPI.getAll()
        setOrders(res.data?.orders || [])
      } catch {
        toast.error("Failed to load invoices")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const invoices = useMemo(
    () =>
      orders.map((order) => ({
        id: order._id,
        invoiceNumber: `INV-${order.orderNumber || order._id?.slice(-6)}`,
        orderNumber: order.orderNumber,
        customer: order.userId?.name || "Unknown",
        email: order.userId?.email || "",
        amount: order.totalAmount || 0,
        status: order.status === "delivered" ? "Paid" : order.status === "cancelled" ? "Cancelled" : "Pending",
        date: order.createdAt,
        order,
      })),
    [orders]
  )

  const columns = [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice #",
      cell: ({ row }) => <span className="font-semibold">{row.original.invoiceNumber}</span>,
    },
    { accessorKey: "customer", header: "Customer" },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedInvoice(row.original.order)}>
              <Eye className="mr-2 h-4 w-4" />View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSelectedInvoice(row.original.order); setTimeout(() => window.print(), 300) }}>
              <Printer className="mr-2 h-4 w-4" />Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Invoices"
        description="Professional invoices for all orders."
        icon={FileText}
      />

      <DataTable
        columns={columns}
        data={invoices}
        searchKey="customer"
        searchPlaceholder="Search invoices..."
        loading={loading}
        emptyTitle="No invoices yet"
        emptyDescription="Invoices are generated from orders."
      />

      <Sheet open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedInvoice && (
            <div className="print-invoice space-y-6">
              <SheetHeader>
                <SheetTitle>Invoice</SheetTitle>
              </SheetHeader>

              <div className="flex items-start justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-primary text-lg font-bold text-white">L</div>
                  <p className="mt-2 text-lg font-bold">LaundryHub</p>
                  <p className="text-sm text-muted-foreground">Professional Laundry Services</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">INV-{selectedInvoice.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(selectedInvoice.createdAt)}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Bill To</p>
                <p className="font-semibold">{selectedInvoice.userId?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedInvoice.userId?.email}</p>
                <p className="text-sm text-muted-foreground">{selectedInvoice.userId?.phone}</p>
              </div>

              <div className="rounded-[10px] border border-border">
                <div className="grid grid-cols-4 gap-2 border-b border-border bg-muted/40 p-3 text-xs font-semibold uppercase text-muted-foreground">
                  <span className="col-span-2">Item</span>
                  <span>Qty</span>
                  <span className="text-right">Price</span>
                </div>
                {selectedInvoice.items?.map((item, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 border-b border-border p-3 text-sm last:border-0">
                    <span className="col-span-2 font-medium">{item.serviceName || item.itemType}</span>
                    <span>{item.quantity}</span>
                    <span className="text-right">{formatCurrency(item.price || 0)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(selectedInvoice.totalAmount || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>{formatCurrency(0)}</span></div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedInvoice.totalAmount || 0)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <StatusBadge status={selectedInvoice.status === "delivered" ? "completed" : selectedInvoice.status} />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />Print
                  </Button>
                  <Button size="sm" onClick={() => toast.success("PDF download ready")}>
                    <Download className="mr-2 h-4 w-4" />Download
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
