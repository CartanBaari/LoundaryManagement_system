import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '../components/common/Table';
import { Button } from '../components/common/Button';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Download,
  ShieldCheck,
  Users2,
  Activity,
  AlertTriangle,
  CalendarDays,
  X,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const rolePillStyles = {
  admin: 'bg-indigo-100 text-indigo-700',
  staff: 'bg-slate-100 text-slate-700',
};

const permissionMeta = {
  admin: { label: 'Full Access', className: 'bg-indigo-100 text-indigo-700', icon: Lock },
  staff: { label: 'Partial Access', className: 'bg-slate-100 text-slate-700', icon: ShieldCheck },
};

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortByDate, setSortByDate] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff',
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data?.users || []);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter((user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    filtered.sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return sortByDate === 'latest' ? bDate - aDate : aDate - bDate;
    });

    return filtered;
  }, [users, searchTerm, roleFilter, sortByDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, sortByDate]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.isActive !== false).length;
    const staffAccounts = users.filter((user) => user.role === 'staff').length;
    const growthBase = Math.max(totalUsers - 1, 1);
    const growthRate = (((totalUsers - growthBase) / growthBase) * 100).toFixed(0);

    return {
      totalUsers,
      activeUsers,
      staffAccounts,
      growthRate,
    };
  }, [users]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'staff',
      });
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'staff',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const normalizedValue = name === 'email' ? value.trim().toLowerCase() : value;
    setFormData((prev) => ({
      ...prev,
      [name]: normalizedValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    const normalizedEmail = formData.email.trim().toLowerCase();
    const emailTaken = users.some(
      (user) => user.email?.toLowerCase() === normalizedEmail && user._id !== editingUser?._id
    );

    if (emailTaken) {
      toast.error('Email already in use');
      return;
    }

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, {
          ...formData,
          email: normalizedEmail,
        });
        toast.success('User updated successfully');
      } else {
        await api.post('/users', {
          ...formData,
          email: normalizedEmail,
          password: 'temp_password_123',
        });
        toast.success('User created successfully');
      }

      handleCloseModal();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });

  const getInitials = (name = '') =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

  const roleTabs = [
    { id: 'all', label: 'All' },
    { id: 'admin', label: 'Admin' },
    { id: 'staff', label: 'Staff' },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-indigo-100 bg-gradient-to-br from-[#f7f5ff] via-[#f8fafc] to-[#eef6ff] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-indigo-100 max-w-2xl">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search for users, roles, or actions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">User Management</h1>
              <p className="mt-3 text-lg text-slate-600">
                Manage enterprise permissions, monitor user activity, and configure staff access
                without affecting your current workflows.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <Button
              variant="outline"
              className="border-0 bg-indigo-100/80 px-5 py-3 text-slate-800 hover:bg-indigo-100"
              onClick={() => toast.success('User report export is ready to be connected')}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button
              variant="outline"
              className="border-0 bg-indigo-100/80 px-5 py-3 text-slate-800 hover:bg-indigo-100"
              onClick={() => toast.success('Role settings panel can be connected next')}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Role Settings
            </Button>
            <Button
              variant="primary"
              className="rounded-2xl bg-[#3a2fd0] px-6 py-3 shadow-[0_12px_30px_rgba(58,47,208,0.25)] hover:bg-[#2f26af]"
              onClick={() => handleOpenModal()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <Card className="rounded-[28px] border-indigo-100 shadow-[0_20px_50px_rgba(99,102,241,0.08)]">
            <CardContent className="space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-[#3a2fd0]">
                  <Users2 className="h-7 w-7" />
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  +{stats.growthRate}% vs last month
                </span>
              </div>
              <div>
                <p className="text-lg text-slate-600">Total Users</p>
                <p className="mt-2 text-5xl font-bold tracking-tight text-slate-900">
                  {stats.totalUsers.toLocaleString()}
                </p>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 w-4/5 rounded-full bg-[#3a2fd0]" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-emerald-500 shadow-[0_20px_50px_rgba(16,185,129,0.09)]">
            <CardContent className="space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Activity className="h-7 w-7" />
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                  Real-time
                </span>
              </div>
              <div>
                <p className="text-lg text-slate-600">Active Now</p>
                <p className="mt-2 text-5xl font-bold tracking-tight text-slate-900">
                  {stats.activeUsers}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Systems running optimal
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-amber-300 shadow-[0_20px_50px_rgba(245,158,11,0.08)]">
            <CardContent className="space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                  Action Required
                </span>
              </div>
              <div>
                <p className="text-lg text-slate-600">Staff Accounts</p>
                <p className="mt-2 text-5xl font-bold tracking-tight text-slate-900">
                  {stats.staffAccounts}
                </p>
              </div>
              <p className="text-sm italic text-slate-500">Customer accounts are managed from Customers.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl bg-[#f2f1ff] p-2">
          {roleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleFilter(tab.id)}
              className={`rounded-xl px-6 py-3 text-sm font-medium transition-all ${
                roleFilter === tab.id
                  ? 'bg-white text-[#3a2fd0] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="rounded-2xl border-slate-200 bg-white px-5 py-3"
            onClick={() => toast.success('Advanced filters can be connected here')}
          >
            <Search className="mr-2 h-4 w-4" />
            More Filters
          </Button>
          <Button
            variant="outline"
            className="rounded-2xl border-slate-200 bg-white px-5 py-3"
            onClick={() => setSortByDate((prev) => (prev === 'latest' ? 'oldest' : 'latest'))}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            {sortByDate === 'latest' ? 'Date Added' : 'Oldest First'}
          </Button>
        </div>
      </div>

      <Card className="rounded-[30px] border-indigo-100 p-0 shadow-[0_22px_70px_rgba(99,102,241,0.08)] overflow-hidden">
        <CardHeader className="border-b border-slate-100 px-8 py-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl">Team Directory</CardTitle>
              <CardDescription>
                Showing {paginatedUsers.length} of {filteredUsers.length} matched users
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-slate-500">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-500">No users found</div>
          ) : (
            <>
              <Table>
                <TableHead className="bg-[#8888c7]">
                  <TableRow className="hover:bg-transparent">
                    <TableHeader>User</TableHeader>
                    <TableHeader>Role</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Date Added</TableHeader>
                    <TableHeader>Permissions</TableHeader>
                    <TableHeader>Contact</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedUsers.map((user) => {
                    const permission = permissionMeta[user.role] || permissionMeta.staff;
                    const PermissionIcon = permission.icon;
                    const isActive = user.isActive !== false;

                    return (
                      <TableRow key={user._id} className="hover:bg-[#fafaff]">
                        <TableCell className="whitespace-normal">
                          <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-600 text-sm font-semibold text-white">
                              {getInitials(user.name)}
                            </div>
                            <div>
                              <p className="text-xl font-semibold text-slate-900">{user.name}</p>
                              <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${
                              rolePillStyles[user.role] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-2 text-base text-slate-800">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                isActive ? 'bg-emerald-600' : 'bg-slate-300'
                              }`}
                            />
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(user.createdAt || new Date())}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${permission.className}`}
                          >
                            <PermissionIcon className="h-4 w-4" />
                            {permission.label}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <div className="space-y-2 text-sm text-slate-600">
                            <p className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-slate-400" />
                              {user.email}
                            </p>
                            <p className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-400" />
                              {user.phone || 'N/A'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenModal(user)}
                              className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {user._id !== currentUser._id && (
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                className="rounded-xl p-2 text-red-600 transition-colors hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-4 border-t border-slate-100 px-8 py-6 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-600">
                  Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredUsers.length)} of{' '}
                  {filteredUsers.length} users
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="rounded-xl px-3 py-2 text-slate-500 transition-colors hover:bg-slate-100"
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 4) }, (_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`h-11 w-11 rounded-2xl text-sm font-semibold transition-colors ${
                          currentPage === pageNumber
                            ? 'bg-[#3a2fd0] text-white shadow-[0_10px_24px_rgba(58,47,208,0.25)]'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  {totalPages > 4 && <span className="px-2 text-slate-400">...</span>}
                  {totalPages > 4 && (
                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      className={`h-11 min-w-[44px] rounded-2xl px-3 text-sm font-semibold transition-colors ${
                        currentPage === totalPages
                          ? 'bg-[#3a2fd0] text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {totalPages}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className="rounded-xl px-3 py-2 text-slate-500 transition-colors hover:bg-slate-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Roles & Permissions Overview</h2>
            <p className="text-slate-600">Defining access boundaries for system integrity.</p>
          </div>
          <button
            type="button"
            onClick={() => toast.success('Role customization can be connected here')}
            className="text-base font-semibold text-[#3a2fd0] transition-colors hover:text-[#2f26af]"
          >
            Customize Roles
          </button>
        </div>

        <div className="grid gap-5 xl:grid-cols-4 md:grid-cols-2">
          {[
            {
              title: 'Administrator',
              subtitle: 'UNRESTRICTED',
              color: 'text-[#3a2fd0]',
              points: ['System Settings', 'User Management', 'Financial Records'],
            },
            {
              title: 'Manager',
              subtitle: 'HIGH LEVEL',
              color: 'text-indigo-500',
              points: ['Order Approvals', 'Inventory Control', 'Delete Users'],
            },
            {
              title: 'Support',
              subtitle: 'OPERATIONAL',
              color: 'text-amber-500',
              points: ['Ticketing System', 'User Profile View', 'Pricing Edits'],
            },
            {
              title: 'Delivery Staff',
              subtitle: 'MOBILE ACCESS',
              color: 'text-emerald-500',
              points: ['Order Status Update', 'Client Contacts', 'Dashboard Admin'],
            },
          ].map((role) => (
            <Card key={role.title} className="rounded-[28px] border-slate-200">
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">{role.title}</h3>
                    <p className={`mt-1 text-sm font-semibold tracking-[0.18em] ${role.color}`}>
                      {role.subtitle}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-slate-100" />
                </div>
                <div className="space-y-3">
                  {role.points.map((point, index) => (
                    <div key={point} className="flex items-center gap-3 text-slate-700">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          index < 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {index < 2 ? '✓' : '×'}
                      </span>
                      {point}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg rounded-[28px] border-indigo-100 shadow-[0_30px_80px_rgba(58,47,208,0.18)]">
            <CardHeader className="border-b border-slate-100 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">
                    {editingUser ? 'Edit User' : 'Add New User'}
                  </CardTitle>
                  <CardDescription>
                    {editingUser
                      ? 'Update user details without affecting current access rules.'
                      : 'Create a new account and assign the right access level.'}
                  </CardDescription>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-[#3a2fd0] focus:outline-none focus:ring-2 focus:ring-[#3a2fd0]/15"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
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
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-[#3a2fd0] focus:outline-none focus:ring-2 focus:ring-[#3a2fd0]/15"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:border-[#3a2fd0] focus:outline-none focus:ring-2 focus:ring-[#3a2fd0]/15"
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <Button type="submit" variant="primary" className="flex-1 rounded-2xl bg-[#3a2fd0] py-3 hover:bg-[#2f26af]">
                    {editingUser ? 'Update User' : 'Create User'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1 rounded-2xl py-3">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Users;
