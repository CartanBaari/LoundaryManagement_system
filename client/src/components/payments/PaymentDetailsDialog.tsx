import type { ReactNode } from "react"
import { ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PaymentStatusBadge } from "@/components/shared/StatusBadge"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { PaymentTransaction } from "@/components/payments/types"

interface PaymentDetailsDialogProps {
  transaction: PaymentTransaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (transaction: PaymentTransaction) => void
  isAdmin?: boolean
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-[#111827] sm:col-span-2">{value || "—"}</dd>
    </div>
  )
}

export default function PaymentDetailsDialog({
  transaction,
  open,
  onOpenChange,
  onEdit,
  isAdmin,
}: PaymentDetailsDialogProps) {
  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>{transaction.transactionNumber}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={transaction.type === "income" ? "success" : "secondary"}>
              {transaction.type === "income" ? "Income" : "Expense"}
            </Badge>
            <PaymentStatusBadge status={transaction.status} />
          </div>

          <Separator />

          <dl className="space-y-3">
            <DetailRow label="Category" value={transaction.categoryLabel} />
            <DetailRow
              label={transaction.type === "income" ? "Customer" : "Supplier"}
              value={transaction.party}
            />
            <DetailRow label="Amount" value={formatCurrency(transaction.amount)} />
            <DetailRow label="Payment Method" value={transaction.paymentMethodLabel} />
            <DetailRow label="Date" value={formatDate(transaction.date)} />

            {transaction.type === "income" ? (
              <>
                <DetailRow label="Order" value={transaction.orderNumber} />
                <DetailRow label="Invoice" value={transaction.invoiceNumber} />
                <DetailRow label="Reference" value={transaction.referenceNumber} />
                <DetailRow
                  label="Remaining Balance"
                  value={
                    transaction.remainingBalance !== undefined
                      ? formatCurrency(transaction.remainingBalance)
                      : undefined
                  }
                />
                <DetailRow label="Notes" value={transaction.notes} />
              </>
            ) : (
              <>
                <DetailRow label="Receipt No" value={transaction.receiptNumber} />
                <DetailRow label="Description" value={transaction.description || transaction.notes} />
                {transaction.receiptData ? (
                  <DetailRow
                    label="Receipt"
                    value={
                      <a
                        href={transaction.receiptData}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {transaction.receiptFileName || "View receipt"}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    }
                  />
                ) : null}
              </>
            )}
          </dl>

          {isAdmin && onEdit ? (
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  onEdit(transaction)
                }}
              >
                Edit Transaction
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
