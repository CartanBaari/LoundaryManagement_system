import { Truck, MapPin, Clock3, PackageCheck } from "lucide-react"
import { toast } from "sonner"
import PageHeader from "@/components/shared/PageHeader"
import DataTable from "@/components/shared/DataTable"
import StatCard from "@/components/shared/StatCard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const routeRows = [
  { id: 1, route: "Route A1", driver: "David Muli", window: "09:00 - 11:00", orders: "8 stops", status: "In Transit" },
  { id: 2, route: "Route B3", driver: "Amina Yusuf", window: "12:00 - 15:00", orders: "5 stops", status: "Ready" },
  { id: 3, route: "Route C2", driver: "Grace Njeri", window: "16:00 - 18:00", orders: "6 stops", status: "Scheduled" },
]

const dispatchNotes = [
  "Morning zone is fully covered",
  "Two high-priority deliveries moved to Route A1",
  "Customer ETA messages sent for all active runs",
]

const coverageAreas = ["Nairobi CBD", "Westlands", "Kilimani"]

const statusVariant = (status) => {
  if (status === "In Transit") return "default"
  if (status === "Ready") return "secondary"
  return "outline"
}

export default function PickupDelivery() {
  const columns = [
    {
      accessorKey: "route",
      header: "Route",
      cell: ({ row }) => <span className="font-semibold">{row.original.route}</span>,
    },
    { accessorKey: "driver", header: "Driver" },
    { accessorKey: "window", header: "Window" },
    { accessorKey: "orders", header: "Stops" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge>,
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pickup & Delivery"
        description="Coordinate route windows, delivery readiness, and pickup fulfillment."
        icon={Truck}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast.success("Route optimization can be connected next")}>
              <MapPin className="mr-2 h-4 w-4" />Optimize Routes
            </Button>
            <Button onClick={() => toast.success("Pickup scheduling can be connected here")}>
              <Truck className="mr-2 h-4 w-4" />Schedule Pickup
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Routes Today" value={16} icon={Truck} />
        <StatCard label="On-Time Rate" value="94%" icon={Clock3} />
        <StatCard label="Completed Stops" value={37} icon={PackageCheck} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <h3 className="mb-4 text-lg font-semibold">Route Assignments</h3>
          <DataTable
            columns={columns}
            data={routeRows}
            searchKey="route"
            searchPlaceholder="Search routes or drivers..."
            emptyTitle="No routes scheduled"
            emptyDescription="Route assignments will appear here."
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dispatch Notes</CardTitle>
              <CardDescription>Operational highlights for today&apos;s movement plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dispatchNotes.map((note) => (
                <div key={note} className="rounded-[10px] bg-muted/50 p-3 text-sm">
                  {note}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coverage Areas</CardTitle>
              <CardDescription>High-volume service zones today.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {coverageAreas.map((area) => (
                <div key={area} className="flex items-center gap-2 rounded-[10px] bg-muted/50 p-3 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  {area}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
