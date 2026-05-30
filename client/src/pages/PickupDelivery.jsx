import { Truck, Search, MapPin, Clock3, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import FeatureWorkspace from '../components/common/FeatureWorkspace';

const routeRows = [
  { id: 1, route: 'Route A1', driver: 'David Muli', window: '09:00 - 11:00', orders: '8 stops', status: 'In Transit' },
  { id: 2, route: 'Route B3', driver: 'Amina Yusuf', window: '12:00 - 15:00', orders: '5 stops', status: 'Ready' },
  { id: 3, route: 'Route C2', driver: 'Grace Njeri', window: '16:00 - 18:00', orders: '6 stops', status: 'Scheduled' },
];

const PickupDelivery = () => (
  <FeatureWorkspace
    eyebrow="Field Logistics"
    title="Pickup & Delivery"
    description="Coordinate route windows, delivery readiness, and pickup fulfillment with a clearer operational workspace."
    tone="sky"
    actions={[
      { label: 'Optimize Routes', icon: MapPin, onClick: () => toast.success('Route optimization can be connected next'), className: 'rounded-2xl border-0 bg-sky-100/80 px-5 py-3 text-slate-800 hover:bg-sky-100' },
      { label: 'Schedule Pickup', icon: Truck, variant: 'primary', onClick: () => toast.success('Pickup scheduling can be connected here'), className: 'rounded-2xl bg-[#3a2fd0] px-6 py-3 hover:bg-[#2f26af]' },
    ]}
    stats={[
      { label: 'Routes Today', value: '16', badge: 'Live', icon: Truck, tone: 'sky', helper: 'Pickup and delivery runs scheduled today' },
      { label: 'On-Time Rate', value: '94%', badge: 'Stable', icon: Clock3, tone: 'emerald', helper: 'Measured against promised customer windows' },
      { label: 'Completed Stops', value: '37', badge: 'Progress', icon: PackageCheck, tone: 'indigo', helper: 'Drop-offs and pickups already fulfilled' },
    ]}
    filters={[
      { label: 'search', icon: Search, content: <span className="text-sm text-slate-500">Search routes, drivers, or service windows...</span> },
    ]}
    tableTitle="Route Assignments"
    tableDescription="Daily route visibility for dispatch and fulfillment teams."
    columns={[
      { key: 'route', label: 'Route' },
      { key: 'driver', label: 'Driver' },
      { key: 'window', label: 'Window' },
      { key: 'orders', label: 'Stops' },
      { key: 'status', label: 'Status', render: (value) => <span className={`rounded-full px-3 py-1 text-sm font-medium ${value === 'In Transit' ? 'bg-sky-100 text-sky-700' : value === 'Ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{value}</span> },
    ]}
    rows={routeRows}
    sidePanels={[
      {
        title: 'Dispatch Notes',
        description: 'Operational highlights for today’s movement plan.',
        content: (
          <div className="space-y-4">
            {['Morning zone is fully covered', 'Two high-priority deliveries moved to Route A1', 'Customer ETA messages sent for all active runs'].map((item) => (
              <div key={item} className="rounded-2xl bg-[#f3fbff] p-4 text-slate-700">{item}</div>
            ))}
          </div>
        ),
      },
      {
        title: 'Coverage Areas',
        description: 'High-volume service zones today.',
        content: (
          <div className="space-y-4">
            {['Nairobi CBD', 'Westlands', 'Kilimani'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-[#fafaff] p-4 text-slate-700"><MapPin className="h-5 w-5 text-sky-600" />{item}</div>
            ))}
          </div>
        ),
      },
    ]}
  />
);

export default PickupDelivery;
