import { useMemo, useState } from "react"
import { CreditCard, Plus } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { usePayments } from "@/hooks/usePayments"
import PageHeader from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import {
  PaymentDetailsDialog,
  PaymentFilters,
  PaymentForm,
  PaymentTable,
  SummaryCards,
} from "@/components/payments"
import { formatCurrency, formatDate } from "@/lib/utils"

export default function Payments() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const {
    loading,
    submitting,
    outstandingLoading,
    outstandingOptions,
    filters,
    setFilters,
    summary,
    transactions,
    loadOutstandingOptions,
    createIncome,
    updateIncome,
    createExpense,
    updateExpense,
    deleteTransaction,
  } = usePayments({ isAdmin })

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)

  const openCreate = () => {
    if (!isAdmin) {
      toast.error("Only admins can record payments")
      return
    }
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (transaction) => {
    setViewing(null)
    setEditing(transaction)
    setShowForm(true)
  }

  const exportRows = useMemo(
    () =>
      transactions.map((row) => [
        row.transactionNumber,
        row.type,
        row.categoryLabel,
        row.party,
        row.amount,
        row.paymentMethodLabel,
        row.status,
        formatDate(row.date),
      ]),
    [transactions]
  )

  const exportExcel = () => {
    if (!exportRows.length) {
      toast.error("No transactions to export")
      return
    }

    const header = [
      "Transaction No",
      "Type",
      "Category",
      "Customer/Supplier",
      "Amount",
      "Payment Method",
      "Status",
      "Date",
    ]
    const csv = [header, ...exportRows]
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "")
            return `"${value.replace(/"/g, '""')}"`
          })
          .join(",")
      )
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `payments-export-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Transactions exported to Excel")
  }

  const exportPdf = () => {
    if (!transactions.length) {
      toast.error("No transactions to export")
      return
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700")
    if (!printWindow) {
      toast.error("Unable to open print window. Please allow pop-ups.")
      return
    }

    const rowsHtml = transactions
      .map(
        (row) => `
      <tr>
        <td>${row.transactionNumber}</td>
        <td>${row.type}</td>
        <td>${row.categoryLabel}</td>
        <td>${row.party}</td>
        <td>${formatCurrency(row.amount)}</td>
        <td>${row.paymentMethodLabel}</td>
        <td>${row.status}</td>
        <td>${formatDate(row.date)}</td>
      </tr>`
      )
      .join("")

    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Transactions</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p { color: #6b7280; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Payment Transactions</h1>
          <p>Generated ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Transaction No</th>
                <th>Type</th>
                <th>Category</th>
                <th>Customer/Supplier</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      toast.info("Use the print dialog and choose Save as PDF")
    }, 300)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payment Management"
        description="Record income and expense transactions, track balances, and monitor daily profit."
        icon={CreditCard}
        action={
          isAdmin ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          ) : null
        }
      />

      <SummaryCards summary={summary} loading={loading} />

      <PaymentFilters
        filters={filters}
        onChange={setFilters}
        onExportExcel={exportExcel}
        onExportPdf={exportPdf}
        showTypeFilter={isAdmin}
      />

      <PaymentTable
        data={transactions}
        loading={loading}
        isAdmin={isAdmin}
        onView={setViewing}
        onEdit={openEdit}
        onDelete={deleteTransaction}
      />

      <PaymentForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open)
          if (!open) setEditing(null)
        }}
        outstandingOptions={outstandingOptions}
        outstandingLoading={outstandingLoading}
        onLoadOutstanding={loadOutstandingOptions}
        submitting={submitting}
        editing={editing}
        onCreateIncome={createIncome}
        onUpdateIncome={updateIncome}
        onCreateExpense={createExpense}
        onUpdateExpense={updateExpense}
      />

      <PaymentDetailsDialog
        transaction={viewing}
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        onEdit={openEdit}
        isAdmin={isAdmin}
      />
    </div>
  )
}
