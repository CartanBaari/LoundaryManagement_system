import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  ArrowUpDown,
  Boxes,
  ChevronRight,
  ClipboardList,
  Cog,
  PackagePlus,
  Search,
  ShieldCheck,
  Sparkles,
  Warehouse,
} from 'lucide-react';

const initialSupplies = [
  { id: 1, name: 'Detergent', type: 'Consumable', category: 'Cleaning', stock: 42, unit: 'bottles', reorderLevel: 15, supplier: 'Spark Chem', location: 'Cleaning Bay', lastUpdated: '2026-04-04' },
  { id: 2, name: 'Fabric Softener', type: 'Consumable', category: 'Cleaning', stock: 12, unit: 'canisters', reorderLevel: 10, supplier: 'Spark Chem', location: 'Cleaning Bay', lastUpdated: '2026-04-03' },
  { id: 3, name: 'Plastic Bags', type: 'Packaging', category: 'Packaging', stock: 18, unit: 'packs', reorderLevel: 20, supplier: 'WrapWell', location: 'Packaging Rack', lastUpdated: '2026-04-04' },
  { id: 4, name: 'Tags', type: 'Labeling', category: 'Front Desk', stock: 120, unit: 'tags', reorderLevel: 60, supplier: 'PaperLine', location: 'Service Desk', lastUpdated: '2026-04-02' },
  { id: 5, name: 'Bleach', type: 'Consumable', category: 'Cleaning', stock: 8, unit: 'gallons', reorderLevel: 12, supplier: 'PureWash', location: 'Chemical Locker', lastUpdated: '2026-04-04' },
];

const initialEquipment = [
  {
    id: 101,
    name: 'Washer A1',
    type: 'Washing Machine',
    location: 'Wash Floor',
    status: 'Operational',
    nextMaintenance: '2026-04-12',
    lastServiced: '2026-03-22',
    serviceHistory: [
      { id: 'svc-1', date: '2026-03-22', summary: 'Drain pump checked and cleaned', engineer: 'MainTech' },
      { id: 'svc-2', date: '2026-02-18', summary: 'Routine drum inspection completed', engineer: 'MainTech' },
    ],
  },
  {
    id: 102,
    name: 'Dryer D2',
    type: 'Dryer',
    location: 'Drying Zone',
    status: 'Maintenance Due',
    nextMaintenance: '2026-04-05',
    lastServiced: '2026-03-01',
    serviceHistory: [
      { id: 'svc-3', date: '2026-03-01', summary: 'Heating coil calibrated', engineer: 'HeatCore' },
    ],
  },
  {
    id: 103,
    name: 'Iron Press P1',
    type: 'Ironing Machine',
    location: 'Finishing Line',
    status: 'Operational',
    nextMaintenance: '2026-04-16',
    lastServiced: '2026-03-25',
    serviceHistory: [
      { id: 'svc-4', date: '2026-03-25', summary: 'Steam pressure tested and passed', engineer: 'PressWorks' },
    ],
  },
  {
    id: 104,
    name: 'Dryer D3',
    type: 'Dryer',
    location: 'Drying Zone',
    status: 'Out of Service',
    nextMaintenance: '2026-04-06',
    lastServiced: '2026-02-27',
    serviceHistory: [
      { id: 'svc-5', date: '2026-02-27', summary: 'Belt replacement completed', engineer: 'HeatCore' },
      { id: 'svc-6', date: '2026-04-01', summary: 'Motor vibration reported for urgent review', engineer: 'Internal Team' },
    ],
  },
];

const supplyCategoryOptions = ['All', 'Cleaning', 'Packaging', 'Front Desk'];
const supplyStatusOptions = ['All', 'Healthy', 'Low Stock'];
const equipmentTypeOptions = ['All', 'Washing Machine', 'Dryer', 'Ironing Machine'];
const equipmentStatusOptions = ['All', 'Operational', 'Maintenance Due', 'Out of Service'];

const equipmentStatusClasses = {
  Operational: 'bg-emerald-100 text-emerald-700',
  'Maintenance Due': 'bg-amber-100 text-amber-700',
  'Out of Service': 'bg-rose-100 text-rose-700',
};

const supplyStatusClasses = {
  Healthy: 'bg-emerald-100 text-emerald-700',
  'Low Stock': 'bg-amber-100 text-amber-700',
};

const getSupplyStatus = (item) => (item.stock <= item.reorderLevel ? 'Low Stock' : 'Healthy');

const formatDate = (value) =>
  new Date(value).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const Inventory = () => {
  const quickAddRef = useRef(null);
  const supplyNameInputRef = useRef(null);
  const equipmentNameInputRef = useRef(null);
  const [activeView, setActiveView] = useState('supplies');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplies, setSupplies] = useState(initialSupplies);
  const [equipment, setEquipment] = useState(initialEquipment);
  const [searchTerm, setSearchTerm] = useState('');
  const [supplyCategoryFilter, setSupplyCategoryFilter] = useState('All');
  const [supplyStatusFilter, setSupplyStatusFilter] = useState('All');
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('All');
  const [equipmentStatusFilter, setEquipmentStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'stock', direction: 'desc' });
  const [supplyDraft, setSupplyDraft] = useState({
    name: '',
    category: 'Cleaning',
    stock: '10',
    unit: 'bottles',
    reorderLevel: '6',
    supplier: 'Main Supplier',
    location: 'Main Store',
  });
  const [equipmentDraft, setEquipmentDraft] = useState({
    name: '',
    type: 'Washing Machine',
    location: 'Wash Floor',
    status: 'Operational',
    nextMaintenance: '2026-04-20',
  });

  const supplyMetrics = useMemo(() => {
    const lowStockCount = supplies.filter((item) => item.stock <= item.reorderLevel).length;
    const healthyCount = supplies.length - lowStockCount;
    const availability = supplies.length ? Math.round((healthyCount / supplies.length) * 100) : 0;

    return {
      totalSupplies: supplies.length,
      lowStockCount,
      availability,
    };
  }, [supplies]);

  const equipmentMetrics = useMemo(() => {
    const operational = equipment.filter((item) => item.status === 'Operational').length;
    const dueSoon = equipment.filter((item) => item.status === 'Maintenance Due').length;
    const outOfService = equipment.filter((item) => item.status === 'Out of Service').length;

    return {
      totalEquipment: equipment.length,
      operational,
      dueSoon,
      outOfService,
    };
  }, [equipment]);

  const lowStockAlerts = useMemo(
    () =>
      supplies
        .filter((item) => item.stock <= item.reorderLevel)
        .map((item) => `${item.name} is at ${item.stock} ${item.unit}. Reorder level is ${item.reorderLevel}.`),
    [supplies]
  );

  const maintenanceAlerts = useMemo(
    () =>
      equipment
        .filter((item) => item.status !== 'Operational' || new Date(item.nextMaintenance) <= new Date('2026-04-08'))
        .map((item) => `${item.name} is ${item.status.toLowerCase()} with maintenance due ${formatDate(item.nextMaintenance)}.`),
    [equipment]
  );
  const filteredSupplies = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const nextRows = supplies.filter((item) => {
      const status = getSupplyStatus(item);
      const matchesQuery =
        !query ||
        [item.name, item.category, item.supplier, item.location, item.unit, status]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesCategory = supplyCategoryFilter === 'All' || item.category === supplyCategoryFilter;
      const matchesStatus = supplyStatusFilter === 'All' || status === supplyStatusFilter;
      return matchesQuery && matchesCategory && matchesStatus;
    });

    return [...nextRows].sort((left, right) => {
      const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
      const leftValue = sortConfig.key === 'status' ? getSupplyStatus(left) : left[sortConfig.key];
      const rightValue = sortConfig.key === 'status' ? getSupplyStatus(right) : right[sortConfig.key];

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * multiplier;
      }

      return String(leftValue).localeCompare(String(rightValue)) * multiplier;
    });
  }, [supplies, searchTerm, supplyCategoryFilter, supplyStatusFilter, sortConfig]);

  const filteredEquipment = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const nextRows = equipment.filter((item) => {
      const matchesQuery =
        !query ||
        [item.name, item.type, item.location, item.status]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesType = equipmentTypeFilter === 'All' || item.type === equipmentTypeFilter;
      const matchesStatus = equipmentStatusFilter === 'All' || item.status === equipmentStatusFilter;
      return matchesQuery && matchesType && matchesStatus;
    });

    return [...nextRows].sort((left, right) => {
      const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
      const leftValue = left[sortConfig.key] ?? '';
      const rightValue = right[sortConfig.key] ?? '';

      if (!Number.isNaN(Date.parse(leftValue)) && !Number.isNaN(Date.parse(rightValue))) {
        return (new Date(leftValue).getTime() - new Date(rightValue).getTime()) * multiplier;
      }

      return String(leftValue).localeCompare(String(rightValue)) * multiplier;
    });
  }, [equipment, searchTerm, equipmentTypeFilter, equipmentStatusFilter, sortConfig]);

  const recentServiceHistory = useMemo(
    () =>
      equipment
        .flatMap((item) =>
          item.serviceHistory.map((record) => ({
            ...record,
            equipmentName: item.name,
            equipmentType: item.type,
          }))
        )
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
        .slice(0, 6),
    [equipment]
  );

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleAudit = () => {
    if (activeView === 'supplies') {
      const lowCount = supplies.filter((item) => item.stock <= item.reorderLevel).length;
      if (!lowCount) {
        toast.success('Consumable stock audit complete. All tracked supplies are healthy.');
        return;
      }
      toast(`${lowCount} supply item(s) need restocking attention.`, { icon: '📦' });
      return;
    }

    const issueCount = equipment.filter((item) => item.status !== 'Operational').length;
    if (!issueCount) {
      toast.success('Equipment audit complete. All machines are operational.');
      return;
    }
    toast(`${issueCount} equipment item(s) need maintenance follow-up.`, { icon: '🛠️' });
  };

  const handleRestockSupply = (id) => {
    setSupplies((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              stock: item.stock + Math.max(item.reorderLevel, 6),
              lastUpdated: '2026-04-04',
            }
          : item
      )
    );
    toast.success('Supply stock level updated.');
  };

  const handleScheduleMaintenance = (id) => {
    setEquipment((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'Maintenance Due',
              nextMaintenance: '2026-04-11',
              serviceHistory: [
                {
                  id: `svc-${Date.now()}-${id}`,
                  date: '2026-04-04',
                  summary: 'Preventive maintenance visit scheduled from inventory module',
                  engineer: 'Internal Team',
                },
                ...item.serviceHistory,
              ],
            }
          : item
      )
    );
    toast.success('Maintenance schedule updated.');
  };

  const handleMarkOperational = (id) => {
    setEquipment((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'Operational',
              lastServiced: '2026-04-04',
              nextMaintenance: '2026-04-25',
              serviceHistory: [
                {
                  id: `svc-${Date.now()}-${id}`,
                  date: '2026-04-04',
                  summary: 'Returned to service after maintenance verification',
                  engineer: 'Internal Team',
                },
                ...item.serviceHistory,
              ],
            }
          : item
      )
    );
    toast.success('Equipment marked operational.');
  };

  const handleAddSupply = () => {
    if (!supplyDraft.name.trim()) {
      toast.error('Enter a supply name first.');
      return;
    }

    const nextId = Math.max(0, ...supplies.map((item) => item.id)) + 1;
    setSupplies((current) => [
      {
        id: nextId,
        name: supplyDraft.name.trim(),
        type: 'Consumable',
        category: supplyDraft.category,
        stock: Number(supplyDraft.stock) || 0,
        unit: supplyDraft.unit.trim() || 'units',
        reorderLevel: Number(supplyDraft.reorderLevel) || 0,
        supplier: supplyDraft.supplier.trim() || 'Main Supplier',
        location: supplyDraft.location.trim() || 'Main Store',
        lastUpdated: '2026-04-04',
      },
      ...current,
    ]);
    setSupplyDraft({
      name: '',
      category: 'Cleaning',
      stock: '10',
      unit: 'bottles',
      reorderLevel: '6',
      supplier: 'Main Supplier',
      location: 'Main Store',
    });
    setIsModalOpen(false);
    toast.success('Consumable supply added to inventory.');
  };

  const handleAddEquipment = () => {
    if (!equipmentDraft.name.trim()) {
      toast.error('Enter an equipment name first.');
      return;
    }

    const nextId = Math.max(100, ...equipment.map((item) => item.id)) + 1;
    setEquipment((current) => [
      {
        id: nextId,
        name: equipmentDraft.name.trim(),
        type: equipmentDraft.type,
        location: equipmentDraft.location.trim() || 'Operations Floor',
        status: equipmentDraft.status,
        nextMaintenance: equipmentDraft.nextMaintenance,
        lastServiced: '2026-04-04',
        serviceHistory: [
          {
            id: `svc-${Date.now()}-${nextId}`,
            date: '2026-04-04',
            summary: 'Equipment added and baseline service record created',
            engineer: 'Internal Team',
          },
        ],
      },
      ...current,
    ]);
    setEquipmentDraft({
      name: '',
      type: 'Washing Machine',
      location: 'Wash Floor',
      status: 'Operational',
      nextMaintenance: '2026-04-20',
    });
    setIsModalOpen(false);
    toast.success('Equipment added to asset register.');
  };

  const openAddModal = (view) => {
    setActiveView(view);
    setSortConfig({ key: view === 'supplies' ? 'stock' : 'nextMaintenance', direction: 'desc' });
    setIsModalOpen(true);

    requestAnimationFrame(() => {
      const targetInput = view === 'supplies' ? supplyNameInputRef.current : equipmentNameInputRef.current;
      targetInput?.focus();
    });
  };

  const currentStats =
    activeView === 'supplies'
      ? [
          { label: 'Tracked Supplies', value: supplyMetrics.totalSupplies, badge: 'Consumables', icon: Boxes, tone: 'bg-emerald-100 text-emerald-700', helper: 'Detergent, bleach, bags, tags, and other consumables.' },
          { label: 'Low Stock Alerts', value: supplyMetrics.lowStockCount, badge: 'Reorder', icon: AlertCircle, tone: 'bg-amber-100 text-amber-700', helper: 'Supplies at or below the configured reorder level.' },
          { label: 'Stock Health', value: `${supplyMetrics.availability}%`, badge: 'Ready', icon: Warehouse, tone: 'bg-indigo-100 text-[#3a2fd0]', helper: 'Consumable availability for ongoing operations.' },
        ]
      : [
          { label: 'Tracked Equipment', value: equipmentMetrics.totalEquipment, badge: 'Assets', icon: Cog, tone: 'bg-sky-100 text-sky-700', helper: 'Washers, dryers, ironing machines, and their lifecycle data.' },
          { label: 'Maintenance Due', value: equipmentMetrics.dueSoon, badge: 'Service', icon: ClipboardList, tone: 'bg-amber-100 text-amber-700', helper: 'Machines scheduled for service or preventive maintenance.' },
          { label: 'Operational', value: equipmentMetrics.operational, badge: 'Live', icon: ShieldCheck, tone: 'bg-emerald-100 text-emerald-700', helper: 'Equipment currently ready for laundry operations.' },
        ];

  const activeAlerts = activeView === 'supplies' ? lowStockAlerts : maintenanceAlerts;

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-emerald-100 bg-gradient-to-br from-[#f5fff9] via-white to-[#eefbf4] p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Inventory Management</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">Laundry Stock & Equipment Control</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Manage consumable supplies with low-stock alerts and track washers, dryers, and ironing machines with maintenance schedules and service history.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleAudit} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-100 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-emerald-200">
              <Search className="h-4 w-4" />
              {activeView === 'supplies' ? 'Run Stock Audit' : 'Run Equipment Audit'}
            </button>
            <button type="button" onClick={() => openAddModal(activeView)} className="inline-flex items-center gap-2 rounded-2xl bg-[#3a2fd0] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2f26af]">
              <PackagePlus className="h-4 w-4" />
              {activeView === 'supplies' ? 'Add Supply' : 'Add Equipment'}
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 rounded-[26px] bg-white/80 p-2 shadow-inner">
          {[
            { key: 'supplies', label: 'Consumable Supplies' },
            { key: 'equipment', label: 'Equipment Register' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveView(tab.key);
                setSortConfig({ key: tab.key === 'supplies' ? 'stock' : 'nextMaintenance', direction: 'desc' });
              }}
              className={`rounded-[18px] px-5 py-3 text-sm font-semibold transition ${
                activeView === tab.key ? 'bg-[#0f4aa3] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {currentStats.map((stat) => (
            <div key={stat.label} className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_20px_50px_rgba(16,24,40,0.06)]">
              <div className="flex items-start justify-between">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${stat.tone}`}>
                  <stat.icon className="h-7 w-7" />
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{stat.badge}</span>
              </div>
              <p className="mt-6 text-lg text-slate-600">{stat.label}</p>
              <p className="mt-2 text-5xl font-bold tracking-tight text-slate-900">{stat.value}</p>
              <p className="mt-4 text-sm text-slate-500">{stat.helper}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(340px,0.9fr)]">
        <div className="space-y-5">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_rgba(99,102,241,0.08)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <label className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={activeView === 'supplies' ? 'Search consumables, suppliers, units, or locations...' : 'Search equipment, type, location, or status...'}
                  className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                {activeView === 'supplies' ? (
                  <>
                    <select value={supplyCategoryFilter} onChange={(event) => setSupplyCategoryFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none">
                      {supplyCategoryOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <select value={supplyStatusFilter} onChange={(event) => setSupplyStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none">
                      {supplyStatusOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <select value={equipmentTypeFilter} onChange={(event) => setEquipmentTypeFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none">
                      {equipmentTypeOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <select value={equipmentStatusFilter} onChange={(event) => setEquipmentStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none">
                      {equipmentStatusOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-[30px] border border-indigo-100 bg-white shadow-[0_22px_70px_rgba(99,102,241,0.08)]">
            <div className="border-b border-slate-100 px-7 py-6">
              <h2 className="text-3xl font-bold text-slate-900">
                {activeView === 'supplies' ? 'Consumable Supplies Register' : 'Equipment Maintenance Register'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {activeView === 'supplies'
                  ? 'Track detergent, fabric softener, plastic bags, tags, bleach, and other consumable stock dynamically.'
                  : 'Monitor machine status, maintenance schedules, and service history for laundry equipment.'}
              </p>
            </div>

            <div className="overflow-x-auto">
              {activeView === 'supplies' ? (
                <table className="min-w-full text-left">
                  <thead className="bg-[#fbfbff]">
                    <tr>
                      {[
                        ['name', 'Supply'],
                        ['category', 'Category'],
                        ['stock', 'Stock Level'],
                        ['reorderLevel', 'Low-Stock Threshold'],
                        ['location', 'Location'],
                        ['status', 'Status'],
                      ].map(([key, label]) => (
                        <th key={key} className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <button type="button" className="inline-flex items-center gap-2 transition hover:text-slate-800" onClick={() => handleSort(key)}>
                            {label}
                            <ArrowUpDown className="h-4 w-4" />
                          </button>
                        </th>
                      ))}
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSupplies.length ? (
                      filteredSupplies.map((item) => {
                        const status = getSupplyStatus(item);
                        return (
                          <tr key={item.id} className="border-t border-slate-100 transition hover:bg-[#fafaff]">
                            <td className="px-6 py-5">
                              <div>
                                <p className="font-semibold text-slate-900">{item.name}</p>
                                <p className="mt-1 text-sm text-slate-500">Supplier: {item.supplier}</p>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-sm text-slate-700">{item.category}</td>
                            <td className="px-6 py-5 text-sm font-medium text-slate-900">{item.stock} {item.unit}</td>
                            <td className="px-6 py-5 text-sm text-slate-700">{item.reorderLevel} {item.unit}</td>
                            <td className="px-6 py-5 text-sm text-slate-700">{item.location}</td>
                            <td className="px-6 py-5">
                              <span className={`rounded-full px-3 py-1 text-sm font-medium ${supplyStatusClasses[status]}`}>
                                {status}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <button type="button" onClick={() => handleRestockSupply(item.id)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-[#3a2fd0] transition hover:bg-indigo-50">
                                Restock
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-16 text-center">
                          <div className="mx-auto flex max-w-md flex-col items-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-[#3a2fd0]">
                              <Sparkles className="h-8 w-8" />
                            </div>
                            <h3 className="mt-5 text-2xl font-semibold text-slate-900">No supply records match this view</h3>
                            <p className="mt-2 text-sm text-slate-500">Adjust the search or filter settings to find the supplies you need.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full text-left">
                  <thead className="bg-[#fbfbff]">
                    <tr>
                      {[
                        ['name', 'Equipment'],
                        ['type', 'Type'],
                        ['status', 'Status'],
                        ['nextMaintenance', 'Next Maintenance'],
                        ['lastServiced', 'Last Serviced'],
                        ['location', 'Location'],
                      ].map(([key, label]) => (
                        <th key={key} className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <button type="button" className="inline-flex items-center gap-2 transition hover:text-slate-800" onClick={() => handleSort(key)}>
                            {label}
                            <ArrowUpDown className="h-4 w-4" />
                          </button>
                        </th>
                      ))}
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEquipment.length ? (
                      filteredEquipment.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100 transition hover:bg-[#fafaff]">
                          <td className="px-6 py-5">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                          </td>
                          <td className="px-6 py-5 text-sm text-slate-700">{item.type}</td>
                          <td className="px-6 py-5">
                            <span className={`rounded-full px-3 py-1 text-sm font-medium ${equipmentStatusClasses[item.status]}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-sm text-slate-700">{formatDate(item.nextMaintenance)}</td>
                          <td className="px-6 py-5 text-sm text-slate-700">{formatDate(item.lastServiced)}</td>
                          <td className="px-6 py-5 text-sm text-slate-700">{item.location}</td>
                          <td className="px-6 py-5">
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => handleScheduleMaintenance(item.id)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-[#3a2fd0] transition hover:bg-indigo-50">
                                Schedule
                              </button>
                              <button type="button" onClick={() => handleMarkOperational(item.id)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
                                Resolve
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-16 text-center">
                          <div className="mx-auto flex max-w-md flex-col items-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-[#3a2fd0]">
                              <Sparkles className="h-8 w-8" />
                            </div>
                            <h3 className="mt-5 text-2xl font-semibold text-slate-900">No equipment records match this view</h3>
                            <p className="mt-2 text-sm text-slate-500">Adjust the search or filter settings to find the machine records you need.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div ref={quickAddRef} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-[#3a2fd0]">
                {activeView === 'supplies' ? <Boxes className="h-6 w-6" /> : <Cog className="h-6 w-6" />}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Quick Add</h2>
                <p className="text-sm text-slate-500">
                  {activeView === 'supplies' ? 'Create a new consumable stock record.' : 'Register a machine and initialize its service profile.'}
                </p>
              </div>
            </div>
            {activeView === 'supplies' ? (
              <div className="mt-5 grid gap-3">
                <input ref={supplyNameInputRef} type="text" value={supplyDraft.name} onChange={(event) => setSupplyDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Supply name" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select value={supplyDraft.category} onChange={(event) => setSupplyDraft((current) => ({ ...current, category: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none">
                    {['Cleaning', 'Packaging', 'Front Desk'].map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <input type="text" value={supplyDraft.unit} onChange={(event) => setSupplyDraft((current) => ({ ...current, unit: event.target.value }))} placeholder="Unit" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="number" min="0" value={supplyDraft.stock} onChange={(event) => setSupplyDraft((current) => ({ ...current, stock: event.target.value }))} placeholder="Current stock" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none" />
                  <input type="number" min="0" value={supplyDraft.reorderLevel} onChange={(event) => setSupplyDraft((current) => ({ ...current, reorderLevel: event.target.value }))} placeholder="Low-stock threshold" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none" />
                </div>
                <input type="text" value={supplyDraft.supplier} onChange={(event) => setSupplyDraft((current) => ({ ...current, supplier: event.target.value }))} placeholder="Supplier" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none" />
                <input type="text" value={supplyDraft.location} onChange={(event) => setSupplyDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Storage location" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none" />
                <button type="button" onClick={handleAddSupply} className="rounded-2xl bg-[#0f4aa3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b3a7f]">
                  Save Supply
                </button>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                <input ref={equipmentNameInputRef} type="text" value={equipmentDraft.name} onChange={(event) => setEquipmentDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Equipment name" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none" />
                <select value={equipmentDraft.type} onChange={(event) => setEquipmentDraft((current) => ({ ...current, type: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none">
                  {['Washing Machine', 'Dryer', 'Ironing Machine'].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <input type="text" value={equipmentDraft.location} onChange={(event) => setEquipmentDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Machine location" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select value={equipmentDraft.status} onChange={(event) => setEquipmentDraft((current) => ({ ...current, status: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none">
                    {['Operational', 'Maintenance Due', 'Out of Service'].map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <input type="date" value={equipmentDraft.nextMaintenance} onChange={(event) => setEquipmentDraft((current) => ({ ...current, nextMaintenance: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none" />
                </div>
                <button type="button" onClick={handleAddEquipment} className="rounded-2xl bg-[#0f4aa3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b3a7f]">
                  Save Equipment
                </button>
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Alerts</h2>
                <p className="text-sm text-slate-500">
                  {activeView === 'supplies' ? 'Low-stock notifications for consumables.' : 'Maintenance and service watchlist for equipment.'}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {(activeAlerts.length ? activeAlerts : ['Everything is currently in a healthy state.']).map((alert) => (
                <div key={alert} className="rounded-2xl bg-[#f4fff8] p-4 text-sm leading-7 text-slate-700">
                  {alert}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Service History</h2>
                <p className="text-sm text-slate-500">Latest maintenance and service records across tracked equipment.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {recentServiceHistory.map((entry) => (
                <div key={entry.id} className="rounded-2xl bg-[#fafaff] p-4">
                  <p className="font-semibold text-slate-900">{entry.equipmentName}</p>
                  <p className="mt-1 text-sm text-slate-600">{entry.summary}</p>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                    <span>{entry.equipmentType}</span>
                    <span>{formatDate(entry.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-[32px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.25)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {activeView === 'supplies' ? 'New Supply' : 'New Equipment'}
                </p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                  {activeView === 'supplies' ? 'Add Consumable Supply' : 'Add Equipment Record'}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {activeView === 'supplies'
                    ? 'Capture stock, supplier, and low-stock threshold details.'
                    : 'Capture machine type, location, status, and maintenance schedule.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            {activeView === 'supplies' ? (
              <div className="mt-6 grid gap-4">
                <input
                  ref={supplyNameInputRef}
                  type="text"
                  value={supplyDraft.name}
                  onChange={(event) => setSupplyDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Supply name"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <select
                    value={supplyDraft.category}
                    onChange={(event) => setSupplyDraft((current) => ({ ...current, category: event.target.value }))}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
                  >
                    {['Cleaning', 'Packaging', 'Front Desk'].map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={supplyDraft.unit}
                    onChange={(event) => setSupplyDraft((current) => ({ ...current, unit: event.target.value }))}
                    placeholder="Unit"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="number"
                    min="0"
                    value={supplyDraft.stock}
                    onChange={(event) => setSupplyDraft((current) => ({ ...current, stock: event.target.value }))}
                    placeholder="Current stock"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    value={supplyDraft.reorderLevel}
                    onChange={(event) => setSupplyDraft((current) => ({ ...current, reorderLevel: event.target.value }))}
                    placeholder="Low-stock threshold"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
                  />
                </div>
                <input
                  type="text"
                  value={supplyDraft.supplier}
                  onChange={(event) => setSupplyDraft((current) => ({ ...current, supplier: event.target.value }))}
                  placeholder="Supplier"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
                />
                <input
                  type="text"
                  value={supplyDraft.location}
                  onChange={(event) => setSupplyDraft((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Storage location"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
                />
                <div className="flex flex-wrap justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSupply}
                    className="rounded-2xl bg-[#0f4aa3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b3a7f]"
                  >
                    Save Supply
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                <input
                  ref={equipmentNameInputRef}
                  type="text"
                  value={equipmentDraft.name}
                  onChange={(event) => setEquipmentDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Equipment name"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <select
                    value={equipmentDraft.type}
                    onChange={(event) => setEquipmentDraft((current) => ({ ...current, type: event.target.value }))}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
                  >
                    {['Washing Machine', 'Dryer', 'Ironing Machine'].map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={equipmentDraft.location}
                    onChange={(event) => setEquipmentDraft((current) => ({ ...current, location: event.target.value }))}
                    placeholder="Machine location"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <select
                    value={equipmentDraft.status}
                    onChange={(event) => setEquipmentDraft((current) => ({ ...current, status: event.target.value }))}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
                  >
                    {['Operational', 'Maintenance Due', 'Out of Service'].map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={equipmentDraft.nextMaintenance}
                    onChange={(event) => setEquipmentDraft((current) => ({ ...current, nextMaintenance: event.target.value }))}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddEquipment}
                    className="rounded-2xl bg-[#0f4aa3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b3a7f]"
                  >
                    Save Equipment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
