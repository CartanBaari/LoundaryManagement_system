import { Download, FileSpreadsheet, FileText, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { STATUS_FILTER_OPTIONS, TYPE_FILTER_OPTIONS } from "@/components/payments/constants"
import type { PaymentFiltersState } from "@/components/payments/types"

interface PaymentFiltersProps {
  filters: PaymentFiltersState
  onChange: (filters: PaymentFiltersState) => void
  onExportExcel: () => void
  onExportPdf: () => void
  showTypeFilter?: boolean
}

export default function PaymentFilters({
  filters,
  onChange,
  onExportExcel,
  onExportPdf,
  showTypeFilter = true,
}: PaymentFiltersProps) {
  const update = (key: keyof PaymentFiltersState, value: string) => {
    onChange({ ...filters, [key]: value } as PaymentFiltersState)
  }

  const clearFilters = () => {
    onChange({
      search: "",
      type: "all",
      status: "all",
      startDate: "",
      endDate: "",
    })
  }

  const hasActiveFilters =
    Boolean(filters.search) ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate)

  return (
    <Card className="rounded-[16px]">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => update("search", e.target.value)}
              placeholder="Search transactions..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onExportPdf}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export to PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export to Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {showTypeFilter && (
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={filters.type} onValueChange={(value) => update("type", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={filters.status} onValueChange={(value) => update("status", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>From</Label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => update("startDate", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>To</Label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => update("endDate", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
