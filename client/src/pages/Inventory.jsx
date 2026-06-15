import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  AlertCircle,
  Boxes,
  ClipboardList,
  Cog,
  PackagePlus,
  Search,
  ShieldCheck,
  Warehouse,
} from "lucide-react"
import PageHeader from "@/components/shared/PageHeader"
import DataTable from "@/components/shared/DataTable"
import StatCard from "@/components/shared/StatCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

const initialSupplies = [
  { id: 1, name: "Detergent", type: "Consumable", category: "Cleaning", stock: 42, unit: "bottles", reorderLevel: 15, supplier: "Spark Chem", location: "Cleaning Bay", lastUpdated: "2026-04-04" },
  { id: 2, name: "Fabric Softener", type: "Consumable", category: "Cleaning", stock: 12, unit: "canisters", reorderLevel: 10, supplier: "Spark Chem", location: "Cleaning Bay", lastUpdated: "2026-04-03" },
  { id: 3, name: "Plastic Bags", type: "Packaging", category: "Packaging", stock: 18, unit: "packs", reorderLevel: 20, supplier: "WrapWell", location: "Packaging Rack", lastUpdated: "2026-04-04" },
  { id: 4, name: "Tags", type: "Labeling", category: "Front Desk", stock: 120, unit: "tags", reorderLevel: 60, supplier: "PaperLine", location: "Service Desk", lastUpdated: "2026-04-02" },
  { id: 5, name: "Bleach", type: "Consumable", category: "Cleaning", stock: 8, unit: "gallons", reorderLevel: 12, supplier: "PureWash", location: "Chemical Locker", lastUpdated: "2026-04-04" },
]

const initialEquipment = [
  { id: 101, name: "Washer A1", type: "Washing Machine", location: "Wash Floor", status: "Operational", nextMaintenance: "2026-04-12", lastServiced: "2026-03-22" },
  { id: 102, name: "Dryer D2", type: "Dryer", location: "Drying Zone", status: "Maintenance Due", nextMaintenance: "2026-04-05", lastServiced: "2026-03-01" },
  { id: 103, name: "Iron Press P1", type: "Ironing Machine", location: "Finishing Line", status: "Operational", nextMaintenance: "2026-04-16", lastServiced: "2026-03-25" },
  { id: 104, name: "Dryer D3", type: "Dryer", location: "Drying Zone", status: "Out of Service", nextMaintenance: "2026-04-06", lastServiced: "2026-02-27" },
]

const getSupplyStatus = (item) => (item.stock <= item.reorderLevel ? "Low Stock" : "Healthy")

const formatDate = (value) =>
  new Date(value).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })

export default function Inventory() {
  const [activeView, setActiveView] = useState("supplies")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [supplies, setSupplies] = useState(initialSupplies)
  const [equipment, setEquipment] = useState(initialEquipment)
  const [supplyDraft, setSupplyDraft] = useState({
    name: "", category: "Cleaning", stock: "10", unit: "bottles", reorderLevel: "6", supplier: "Main Supplier", location: "Main Store",
  })
  const [equipmentDraft, setEquipmentDraft] = useState({
    name: "", type: "Washing Machine", location: "Wash Floor", status: "Operational", nextMaintenance: "2026-04-20",
  })

  const supplyMetrics = useMemo(() => {
    const lowStockCount = supplies.filter((i) => i.stock <= i.reorderLevel).length
    const healthyCount = supplies.length - lowStockCount
    const availability = supplies.length ? Math.round((healthyCount / supplies.length) * 100) : 0
    return { total: supplies.length, lowStockCount, availability }
  }, [supplies])

  const equipmentMetrics = useMemo(() => {
    const operational = equipment.filter((i) => i.status === "Operational").length
    const dueSoon = equipment.filter((i) => i.status === "Maintenance Due").length
    return { total: equipment.length, operational, dueSoon }
  }, [equipment])

  const lowStockAlerts = useMemo(
    () =>
      supplies
        .filter((i) => i.stock <= i.reorderLevel)
        .map((i) => `${i.name} is at ${i.stock} ${i.unit}. Reorder level is ${i.reorderLevel}.`),
    [supplies]
  )

  const handleAudit = () => {
    if (activeView === "supplies") {
      const lowCount = supplies.filter((i) => i.stock <= i.reorderLevel).length
      if (!lowCount) toast.success("Consumable stock audit complete. All tracked supplies are healthy.")
      else toast(`${lowCount} supply item(s) need restocking attention.`)
      return
    }
    const issueCount = equipment.filter((i) => i.status !== "Operational").length
    if (!issueCount) toast.success("Equipment audit complete. All machines are operational.")
    else toast(`${issueCount} equipment item(s) need maintenance follow-up.`)
  }

  const handleRestockSupply = (id) => {
    setSupplies((c) =>
      c.map((item) =>
        item.id === id
          ? { ...item, stock: item.stock + Math.max(item.reorderLevel, 6), lastUpdated: "2026-04-04" }
          : item
      )
    )
    toast.success("Supply stock level updated.")
  }

  const handleScheduleMaintenance = (id) => {
    setEquipment((c) =>
      c.map((item) =>
        item.id === id ? { ...item, status: "Maintenance Due", nextMaintenance: "2026-04-11" } : item
      )
    )
    toast.success("Maintenance schedule updated.")
  }

  const handleMarkOperational = (id) => {
    setEquipment((c) =>
      c.map((item) =>
        item.id === id
          ? { ...item, status: "Operational", lastServiced: "2026-04-04", nextMaintenance: "2026-04-25" }
          : item
      )
    )
    toast.success("Equipment marked operational.")
  }

  const handleAddSupply = () => {
    if (!supplyDraft.name.trim()) {
      toast.error("Enter a supply name first.")
      return
    }
    const nextId = Math.max(0, ...supplies.map((i) => i.id)) + 1
    setSupplies((c) => [
      {
        id: nextId,
        name: supplyDraft.name.trim(),
        type: "Consumable",
        category: supplyDraft.category,
        stock: Number(supplyDraft.stock) || 0,
        unit: supplyDraft.unit.trim() || "units",
        reorderLevel: Number(supplyDraft.reorderLevel) || 0,
        supplier: supplyDraft.supplier.trim() || "Main Supplier",
        location: supplyDraft.location.trim() || "Main Store",
        lastUpdated: "2026-04-04",
      },
      ...c,
    ])
    setSupplyDraft({ name: "", category: "Cleaning", stock: "10", unit: "bottles", reorderLevel: "6", supplier: "Main Supplier", location: "Main Store" })
    setIsModalOpen(false)
    toast.success("Consumable supply added to inventory.")
  }

  const handleAddEquipment = () => {
    if (!equipmentDraft.name.trim()) {
      toast.error("Enter an equipment name first.")
      return
    }
    const nextId = Math.max(100, ...equipment.map((i) => i.id)) + 1
    setEquipment((c) => [
      {
        id: nextId,
        name: equipmentDraft.name.trim(),
        type: equipmentDraft.type,
        location: equipmentDraft.location.trim() || "Operations Floor",
        status: equipmentDraft.status,
        nextMaintenance: equipmentDraft.nextMaintenance,
        lastServiced: "2026-04-04",
      },
      ...c,
    ])
    setEquipmentDraft({ name: "", type: "Washing Machine", location: "Wash Floor", status: "Operational", nextMaintenance: "2026-04-20" })
    setIsModalOpen(false)
    toast.success("Equipment added to asset register.")
  }

  const supplyColumns = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-semibold">{row.original.name}</span> },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "stock", header: "Stock", cell: ({ row }) => `${row.original.stock} ${row.original.unit}` },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = getSupplyStatus(row.original)
        return <Badge variant={status === "Low Stock" ? "destructive" : "secondary"}>{status}</Badge>
      },
    },
    { accessorKey: "supplier", header: "Supplier" },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => handleRestockSupply(row.original.id)}>
          Restock
        </Button>
      ),
    },
  ]

  const equipmentColumns = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-semibold">{row.original.name}</span> },
    { accessorKey: "type", header: "Type" },
    { accessorKey: "location", header: "Location" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "Operational"
              ? "secondary"
              : row.original.status === "Maintenance Due"
                ? "default"
                : "destructive"
          }
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "nextMaintenance",
      header: "Next Maintenance",
      cell: ({ row }) => formatDate(row.original.nextMaintenance),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.status !== "Operational" ? (
            <Button variant="outline" size="sm" onClick={() => handleMarkOperational(row.original.id)}>
              Mark OK
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => handleScheduleMaintenance(row.original.id)}>
              Schedule
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inventory"
        description="Manage consumable supplies and track equipment maintenance."
        icon={Warehouse}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAudit}>
              <Search className="mr-2 h-4 w-4" />
              {activeView === "supplies" ? "Run Stock Audit" : "Run Equipment Audit"}
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <PackagePlus className="mr-2 h-4 w-4" />
              {activeView === "supplies" ? "Add Supply" : "Add Equipment"}
            </Button>
          </div>
        }
      />

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList>
          <TabsTrigger value="supplies">Consumable Supplies</TabsTrigger>
          <TabsTrigger value="equipment">Equipment Register</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeView === "supplies" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Tracked Supplies" value={supplyMetrics.total} icon={Boxes} />
          <StatCard label="Low Stock Alerts" value={supplyMetrics.lowStockCount} icon={AlertCircle} />
          <StatCard label="Stock Health" value={`${supplyMetrics.availability}%`} icon={Warehouse} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Tracked Equipment" value={equipmentMetrics.total} icon={Cog} />
          <StatCard label="Maintenance Due" value={equipmentMetrics.dueSoon} icon={ClipboardList} />
          <StatCard label="Operational" value={equipmentMetrics.operational} icon={ShieldCheck} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <DataTable
          columns={activeView === "supplies" ? supplyColumns : equipmentColumns}
          data={activeView === "supplies" ? supplies : equipment}
          searchKey="name"
          searchPlaceholder={`Search ${activeView}...`}
          emptyTitle={`No ${activeView} found`}
          emptyDescription={`Add ${activeView} to get started.`}
        />

        {activeView === "supplies" && lowStockAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lowStockAlerts.map((alert) => (
                <div key={alert} className="rounded-[10px] bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  {alert}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeView === "supplies" ? "Add Supply" : "Add Equipment"}</DialogTitle>
            <DialogDescription>
              {activeView === "supplies" ? "Add a new consumable supply item." : "Register new equipment."}
            </DialogDescription>
          </DialogHeader>

          {activeView === "supplies" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={supplyDraft.name} onChange={(e) => setSupplyDraft((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={supplyDraft.category} onValueChange={(v) => setSupplyDraft((p) => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Cleaning", "Packaging", "Front Desk"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stock</Label>
                  <Input type="number" value={supplyDraft.stock} onChange={(e) => setSupplyDraft((p) => ({ ...p, stock: e.target.value }))} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={equipmentDraft.name} onChange={(e) => setEquipmentDraft((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={equipmentDraft.type} onValueChange={(v) => setEquipmentDraft((p) => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Washing Machine", "Dryer", "Ironing Machine"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={equipmentDraft.status} onValueChange={(v) => setEquipmentDraft((p) => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Operational", "Maintenance Due", "Out of Service"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={activeView === "supplies" ? handleAddSupply : handleAddEquipment}>
              Add {activeView === "supplies" ? "Supply" : "Equipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
