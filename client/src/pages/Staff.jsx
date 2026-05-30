import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  UserCog,
  Search,
  TimerReset,
  ShieldCheck,
  CalendarClock,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import FeatureWorkspace from '../components/common/FeatureWorkspace';
import { api, orderAPI, userAPI } from '../services/api';

const Staff = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [staffMembers, setStaffMembers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    const loadStaffData = async () => {
      try {
        setLoading(true);

        const [staffResponse, ordersResponse] = await Promise.all([
          userAPI.getStaff(),
          orderAPI.getAll(),
        ]);

        setStaffMembers(staffResponse.data?.staffMembers || []);
        setOrders(ordersResponse.data?.orders || []);
      } catch (error) {
        toast.error('Failed to load staff overview');
      } finally {
        setLoading(false);
      }
    };

    loadStaffData();
  }, []);

  const reloadStaffData = async () => {
    try {
      setLoading(true);

      const [staffResponse, ordersResponse] = await Promise.all([
        userAPI.getStaff(),
        orderAPI.getAll(),
      ]);

      setStaffMembers(staffResponse.data?.staffMembers || []);
      setOrders(ordersResponse.data?.orders || []);
    } catch (error) {
      toast.error('Failed to refresh staff overview');
    } finally {
      setLoading(false);
    }
  };

  const staffRows = useMemo(() => {
    const assignedOrdersByStaff = orders.reduce((accumulator, order) => {
      const staffId = order.assignedStaff?._id;

      if (!staffId) {
        return accumulator;
      }

      if (!accumulator[staffId]) {
        accumulator[staffId] = [];
      }

      accumulator[staffId].push(order);
      return accumulator;
    }, {});

    const rows = staffMembers.map((member) => {
      const assignedOrders = assignedOrdersByStaff[member._id] || [];
      const activeAssignments = assignedOrders.filter((order) => order.status !== 'delivered');
      const completedAssignments = assignedOrders.filter((order) => order.status === 'delivered');
      const createdDate = member.createdAt ? new Date(member.createdAt) : null;

      return {
        id: member._id,
        member: member.name || 'Unnamed Staff',
        role: member.phone || member.email || 'Staff member',
        email: member.email || '',
        phone: member.phone || 'N/A',
        address: member.address?.trim() || 'No address provided',
        shift: activeAssignments.length > 0 ? 'Assigned' : 'Available',
        workload: `${activeAssignments.length} active order${activeAssignments.length === 1 ? '' : 's'}`,
        status: member.isActive !== false ? 'On Duty' : 'Off Duty',
        totalAssigned: assignedOrders.length,
        completedAssignments: completedAssignments.length,
        joinedLabel: createdDate
          ? createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'N/A',
      };
    });

    if (!searchTerm) {
      return rows;
    }

    const query = searchTerm.toLowerCase();
    return rows.filter((row) =>
      row.member.toLowerCase().includes(query) ||
      row.role.toLowerCase().includes(query) ||
      row.shift.toLowerCase().includes(query) ||
      row.status.toLowerCase().includes(query)
    );
  }, [orders, searchTerm, staffMembers]);

  const stats = useMemo(() => {
    const activeStaff = staffMembers.filter((member) => member.isActive !== false).length;
    const totalStaff = staffMembers.length;
    const assignedOrders = orders.filter((order) => order.assignedStaff?._id);
    const openAssignedOrders = assignedOrders.filter((order) => order.status !== 'delivered').length;
    const shiftsCovered = totalStaff === 0 ? 0 : Math.round((activeStaff / totalStaff) * 100);
    const backlogRisk =
      activeStaff === 0 ? 'High' : openAssignedOrders > activeStaff * 3 ? 'Medium' : 'Low';

    return {
      activeStaff,
      shiftsCovered,
      backlogRisk,
      openAssignedOrders,
    };
  }, [orders, staffMembers]);

  const coverageNotes = useMemo(() => {
    const unassignedOrders = orders.filter((order) => !order.assignedStaff?._id && order.status !== 'delivered').length;
    const inactiveStaff = staffMembers.filter((member) => member.isActive === false).length;
    const overloadedStaff = staffRows.filter((member) => {
      const workloadCount = Number.parseInt(member.workload, 10);
      return workloadCount >= 5;
    }).length;

    return [
      `${stats.activeStaff} active staff available for assignments today`,
      `${unassignedOrders} open order${unassignedOrders === 1 ? '' : 's'} still need staff assignment`,
      inactiveStaff > 0
        ? `${inactiveStaff} staff account${inactiveStaff === 1 ? ' is' : 's are'} currently inactive`
        : 'All staff accounts are currently active',
      overloadedStaff > 0
        ? `${overloadedStaff} staff member${overloadedStaff === 1 ? '' : 's'} have heavy workloads`
        : 'No staff members are currently overloaded',
    ];
  }, [orders, staffMembers, staffRows, stats.activeStaff]);

  const responseTiming = useMemo(() => {
    const totalAssigned = staffRows.reduce((sum, member) => sum + member.totalAssigned, 0);
    const completedAssignments = staffRows.reduce((sum, member) => sum + member.completedAssignments, 0);
    const averageOpenLoad =
      staffRows.length > 0
        ? (
            staffRows.reduce((sum, member) => sum + Number.parseInt(member.workload, 10), 0) /
            staffRows.length
          ).toFixed(1)
        : '0.0';

    return [
      `Total assigned orders: ${totalAssigned}`,
      `Completed assigned orders: ${completedAssignments}`,
      `Average open workload per staff member: ${averageOpenLoad}`,
    ];
  }, [staffRows]);

  const handleStaffInputChange = (e) => {
    const { name, value } = e.target;
    setStaffFormData((prev) => ({
      ...prev,
      [name]: name === 'email' ? value.trim().toLowerCase() : value,
    }));
  };

  const handleCloseAddStaffModal = () => {
    setShowAddStaffModal(false);
    setEditingStaff(null);
    setStaffFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
    });
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();

    if (!staffFormData.name || !staffFormData.email) {
      toast.error('Please fill in name and email');
      return;
    }

    setSavingStaff(true);

    try {
      if (editingStaff) {
        await userAPI.update(editingStaff.id, {
          name: staffFormData.name,
          email: staffFormData.email,
          phone: staffFormData.phone,
          address: staffFormData.address,
        });
        toast.success('Staff member updated successfully');
      } else {
        await api.post('/users', {
          ...staffFormData,
          role: 'staff',
          password: 'temp_password_123',
        });
        toast.success('Staff member created successfully');
      }

      handleCloseAddStaffModal();
      await reloadStaffData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${editingStaff ? 'update' : 'create'} staff member`);
    } finally {
      setSavingStaff(false);
    }
  };

  const handleEditStaff = (staff) => {
    setEditingStaff(staff);
    setStaffFormData({
      name: staff.member,
      email: staff.email,
      phone: staff.phone === 'N/A' ? '' : staff.phone,
      address: staff.address === 'No address provided' ? '' : staff.address,
    });
    setShowAddStaffModal(true);
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    try {
      await userAPI.delete(staffId);
      toast.success('Staff member deleted successfully');
      await reloadStaffData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete staff member');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <FeatureWorkspace
        eyebrow="Team Operations"
        title="Staff"
        description="Manage workforce availability, operational coverage, and team assignments without changing your current system flows."
        tone="emerald"
        actions={[
          {
            label: 'Assign Shift',
            icon: CalendarClock,
            onClick: () => navigate('/orders'),
            className:
              'rounded-2xl border-0 bg-emerald-100/80 px-5 py-3 text-slate-800 hover:bg-emerald-100',
          },
          {
            label: 'Add Staff',
            icon: UserCog,
            variant: 'primary',
            onClick: () => setShowAddStaffModal(true),
            className: 'rounded-2xl bg-[#3a2fd0] px-6 py-3 hover:bg-[#2f26af]',
          },
        ]}
        stats={[
          {
            label: 'Active Staff',
            value: loading ? '...' : String(stats.activeStaff),
            badge: 'Today',
            icon: Briefcase,
            tone: 'emerald',
            helper: `${staffMembers.length} total staff account${staffMembers.length === 1 ? '' : 's'}`,
          },
          {
            label: 'Shifts Covered',
            value: loading ? '...' : `${stats.shiftsCovered}%`,
            badge: 'Live',
            icon: CalendarClock,
            tone: 'sky',
            helper: `${stats.openAssignedOrders} assigned order${stats.openAssignedOrders === 1 ? '' : 's'} in progress`,
          },
          {
            label: 'Backlog Risk',
            value: loading ? '...' : stats.backlogRisk,
            badge: stats.backlogRisk === 'Low' ? 'Healthy' : 'Attention',
            icon: ShieldCheck,
            tone: stats.backlogRisk === 'Low' ? 'indigo' : 'amber',
            helper: 'Based on active staff versus open assigned orders',
          },
        ]}
        filters={[
          {
            label: 'search',
            icon: Search,
            content: (
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff, roles, shifts, or status..."
                className="w-72 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            ),
          },
        ]}
        tableTitle="Staff Coverage Board"
        tableDescription={
          loading
            ? 'Loading live staff coverage data...'
            : `Showing ${staffRows.length} staff member${staffRows.length === 1 ? '' : 's'} with real assignment workload`
        }
        columns={[
          {
            key: 'member',
            label: 'Team Member',
            render: (value, row) => (
              <div>
                <p className="font-semibold text-slate-900">{value}</p>
                <p className="text-sm text-slate-500">{row.role}</p>
              </div>
            ),
          },
          { key: 'shift', label: 'Shift' },
          { key: 'workload', label: 'Workload' },
          {
            key: 'status',
            label: 'Status',
            render: (value) => (
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  value === 'On Duty'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {value}
              </span>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEditStaff(row)}
                  className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteStaff(row.id)}
                  className="rounded-xl p-2 text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        rows={
          loading
            ? [
                {
                  id: 'loading',
                  member: 'Loading staff...',
                  role: 'Fetching live staff data',
                  shift: '...',
                  workload: '...',
                  status: 'Off Duty',
                },
              ]
            : staffRows.length > 0
              ? staffRows
              : [
                  {
                    id: 'empty',
                    member: 'No staff found',
                    role: 'Create staff users to see live coverage here',
                    shift: 'N/A',
                    workload: '0 active orders',
                    status: 'Off Duty',
                  },
                ]
        }
        sidePanels={[
          {
            title: 'Coverage Notes',
            description: 'Quick staffing actions and reminders.',
            content: (
              <div className="space-y-4">
                {(loading ? ['Preparing live staffing notes...'] : coverageNotes).map((item) => (
                  <div key={item} className="rounded-2xl bg-[#f5fff8] p-4 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            ),
          },
          {
            title: 'Response Timing',
            description: 'Service readiness across active crews.',
            content: (
              <div className="space-y-4">
                {(loading ? ['Calculating live workload timing...'] : responseTiming).map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl bg-[#fafaff] p-4 text-slate-700"
                  >
                    <TimerReset className="h-5 w-5 text-emerald-600" />
                    {item}
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />

      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg rounded-[28px] border-indigo-100 shadow-[0_30px_80px_rgba(58,47,208,0.18)]">
            <CardHeader className="border-b border-slate-100 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</CardTitle>
                  <CardDescription>
                    {editingStaff
                      ? 'Update a staff account here without affecting User Management.'
                      : 'Create a staff account here without affecting User Management.'}
                  </CardDescription>
                </div>
                <button
                  onClick={handleCloseAddStaffModal}
                  className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreateStaff} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={staffFormData.name}
                    onChange={handleStaffInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-[#3a2fd0] focus:outline-none focus:ring-2 focus:ring-[#3a2fd0]/15"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={staffFormData.email}
                    onChange={handleStaffInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-[#3a2fd0] focus:outline-none focus:ring-2 focus:ring-[#3a2fd0]/15"
                    required
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={staffFormData.phone}
                      onChange={handleStaffInputChange}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-[#3a2fd0] focus:outline-none focus:ring-2 focus:ring-[#3a2fd0]/15"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={staffFormData.address}
                      onChange={handleStaffInputChange}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-[#3a2fd0] focus:outline-none focus:ring-2 focus:ring-[#3a2fd0]/15"
                    />
                  </div>
                </div>

                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {editingStaff
                    ? 'Update staff details here without affecting other accounts.'
                    : <>New staff accounts are created with a temporary password: <span className="font-semibold">temp_password_123</span></>}
                </p>

                <div className="flex gap-4 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 rounded-2xl bg-[#3a2fd0] py-3 hover:bg-[#2f26af]"
                    disabled={savingStaff}
                  >
                    {savingStaff ? (editingStaff ? 'Saving...' : 'Creating...') : (editingStaff ? 'Update Staff' : 'Create Staff')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseAddStaffModal}
                    className="flex-1 rounded-2xl py-3"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default Staff;
