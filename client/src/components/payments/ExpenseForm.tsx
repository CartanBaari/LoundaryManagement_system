import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ExpenseFormValues } from "@/components/payments/types"

interface ExpenseFormProps {
  form: ExpenseFormValues
  onChange: (name: keyof ExpenseFormValues, value: string) => void
  disabledFields?: boolean
  categories?: Array<{ value: string; label: string }>
  paymentMethods?: Array<{ value: string; label: string }>
  optionsLoading?: boolean
}

export default function ExpenseForm({
  form,
  onChange,
  disabledFields,
  categories = [],
  paymentMethods = [],
  optionsLoading,
}: ExpenseFormProps) {
  const handleCategoryChange = (value: string) => {
    onChange("category", value)
    const selected = categories.find((category) => category.value === value)
    if (selected) {
      onChange("title", selected.label)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>
            type <span className="text-destructive">*</span>
          </Label>
          <Input value="expense payment" readOnly className="bg-muted capitalize" />
        </div>

        <div className="space-y-2">
          <Label>
            Choose expense type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.category || undefined}
            onValueChange={handleCategoryChange}
            disabled={disabledFields || optionsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={optionsLoading ? "Loading..." : "Choose a expense"} />
            </SelectTrigger>
            <SelectContent className="z-[110]">
              {categories.length === 0 ? (
                <SelectItem value="__empty" disabled>
                  No active expense types
                </SelectItem>
              ) : (
                categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Amount <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => onChange("amount", e.target.value)}
            placeholder="Amount"
            disabled={disabledFields}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>
            Date <span className="text-destructive">*</span>
          </Label>
          <Input
            type="date"
            value={form.expenseDate}
            onChange={(e) => onChange("expenseDate", e.target.value)}
            disabled={disabledFields}
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>
            Account <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.paymentMethod || undefined}
            onValueChange={(value) => onChange("paymentMethod", value)}
            disabled={disabledFields || optionsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={optionsLoading ? "Loading..." : "Choose Account"} />
            </SelectTrigger>
            <SelectContent className="z-[110]">
              {paymentMethods.length === 0 ? (
                <SelectItem value="__empty" disabled>
                  No active accounts
                </SelectItem>
              ) : (
                paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>
            Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            value={form.description}
            onChange={(e) => onChange("description", e.target.value)}
            rows={4}
            placeholder="Description"
            disabled={disabledFields}
            required
          />
        </div>
      </div>
    </div>
  )
}
