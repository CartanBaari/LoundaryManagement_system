import { useMemo, useState } from "react"
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import DataTable from "@/components/shared/DataTable"
import { PaymentStatusBadge } from "@/components/shared/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { formatCurrency, formatDate } from "@/lib/utils"
import type { PaymentTransaction } from "@/components/payments/types"

interface PaymentTableProps {
  data: PaymentTransaction[]
  loading?: boolean
  isAdmin?: boolean
  onView: (row: PaymentTransaction) => void
  onEdit: (row: PaymentTransaction) => void
  onDelete: (row: PaymentTransaction) => Promise<boolean> | boolean
}

export default function PaymentTable({
  data,
  loading,
  isAdmin,
  onView,
  onEdit,
  onDelete,
}: PaymentTableProps) {
  const [pendingDelete, setPendingDelete] = useState<PaymentTransaction | null>(null)
  const [deleting, setDeleting] = useState(false)

  const columns = useMemo<ColumnDef<PaymentTransaction>[]>(
    () => [
      {
        accessorKey: "transactionNumber",
        header: "Transaction No",
        cell: ({ row }) => (
          <span className="font-semibold tracking-wide">{row.original.transactionNumber}</span>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant={row.original.type === "income" ? "success" : "secondary"}>
            {row.original.type === "income" ? "Income" : "Expense"}
          </Badge>
        ),
      },
      {
        accessorKey: "categoryLabel",
        header: "Category",
      },
      {
        accessorKey: "party",
        header: "Customer/Supplier",
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className={row.original.type === "expense" ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>
            {row.original.type === "expense" ? "-" : "+"}
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: "paymentMethodLabel",
        header: "Payment Method",
        cell: ({ row }) => <Badge variant="outline">{row.original.paymentMethodLabel}</Badge>,
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
        header: "Actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(row.original)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => onEdit(row.original)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-danger focus:text-danger"
                    onClick={() => setPendingDelete(row.original)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [isAdmin, onEdit, onView]
  )

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await onDelete(pendingDelete)
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        showSearch={false}
        loading={loading}
        emptyTitle="No transactions found"
        emptyDescription="Record an income or expense payment to get started."
      />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold">{pendingDelete?.transactionNumber}</span>. Related invoice
              balances will be recalculated for income payments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
