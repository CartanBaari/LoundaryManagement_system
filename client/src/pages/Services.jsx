import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Shirt, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '../components/common/Table';
import { Button } from '../components/common/Button';
import { categoryAPI, serviceAPI } from '../services/api';

const initialFormState = {
  name: '',
  category: '',
  washPrice: '0',
  ironPrice: '0',
  dryCleanPrice: '0',
  status: 'active',
};

const Services = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [servicesResponse, categoriesResponse] = await Promise.all([
          serviceAPI.getAll(),
          categoryAPI.getAll({ activeOnly: true }),
        ]);
        const nextCategories = categoriesResponse.data?.categories || [];
        setServices(servicesResponse.data?.services || []);
        setCategories(nextCategories);
        setFormData((prev) => ({
          ...prev,
          category: prev.category || nextCategories[0]?.name || '',
        }));
      } catch (error) {
        toast.error('Failed to load services');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredServices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return services.filter((service) =>
      !query ||
      service.name.toLowerCase().includes(query) ||
      service.category.toLowerCase().includes(query) ||
      service.status.toLowerCase().includes(query)
    );
  }, [services, searchTerm]);

  const stats = useMemo(() => {
    const activeCount = services.filter((service) => service.status === 'active').length;
    const totalWashPricing = services.reduce((sum, service) => sum + Number(service.washPrice || 0), 0);

    return [
      { label: 'Catalog Items', value: services.length, helper: 'Laundry items currently available in the system' },
      { label: 'Active Services', value: activeCount, helper: 'Items visible for new client orders' },
      { label: 'Wash Pricing Total', value: `$${totalWashPricing.toFixed(2)}`, helper: 'Combined wash pricing across the catalog' },
    ];
  }, [services]);

  const closeModal = () => {
    setShowModal(false);
    setEditingService(null);
    setFormData({
      ...initialFormState,
      category: categories[0]?.name || '',
    });
  };

  const openModal = (service = null) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        category: service.category,
        washPrice: String(service.washPrice ?? 0),
        ironPrice: String(service.ironPrice ?? 0),
        dryCleanPrice: String(service.dryCleanPrice ?? 0),
        status: service.status,
      });
    } else {
      setEditingService(null);
      setFormData({
        ...initialFormState,
        category: categories[0]?.name || '',
      });
    }

    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.category.trim()) {
      toast.error('Please complete the service name and choose a category');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      washPrice: Number(formData.washPrice || 0),
      ironPrice: Number(formData.ironPrice || 0),
      dryCleanPrice: Number(formData.dryCleanPrice || 0),
      status: formData.status,
    };

    setSubmitting(true);

    try {
      if (editingService) {
        const response = await serviceAPI.update(editingService._id, payload);
        setServices((prev) =>
          prev.map((service) => (service._id === editingService._id ? response.data.service : service))
        );
        toast.success('Service updated successfully');
      } else {
        const response = await serviceAPI.create(payload);
        setServices((prev) => [response.data.service, ...prev]);
        toast.success('Service created successfully');
      }

      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) {
      return;
    }

    try {
      await serviceAPI.delete(serviceId);
      setServices((prev) => prev.filter((service) => service._id !== serviceId));
      toast.success('Service deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete service');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Services Management</h1>
          <p className="mt-1 text-gray-600">Manage laundry items, pricing, and availability.</p>
        </div>
        <Button variant="primary" onClick={() => openModal()} className="flex items-center gap-2">
          <Plus size={18} />
          Create Service
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent>
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="mt-2 text-sm text-gray-500">{stat.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Service Catalog</CardTitle>
              <CardDescription>All laundry items and their available prices.</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-gray-600">Loading services...</div>
          ) : filteredServices.length === 0 ? (
            <div className="py-10 text-center text-gray-600">No services found</div>
          ) : (
            <Table>
              <TableHead>
                <TableRow className="bg-gray-50">
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Wash Price</TableHeader>
                  <TableHeader>Iron Price</TableHeader>
                  <TableHeader>Dry Clean Price</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service._id}>
                    <TableCell className="font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                          <Shirt size={18} />
                        </div>
                        {service.name}
                      </div>
                    </TableCell>
                    <TableCell>{service.category}</TableCell>
                    <TableCell>${Number(service.washPrice || 0).toFixed(2)}</TableCell>
                    <TableCell>${Number(service.ironPrice || 0).toFixed(2)}</TableCell>
                    <TableCell>${Number(service.dryCleanPrice || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          service.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {service.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openModal(service)}
                          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(service._id)}
                          className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{editingService ? 'Edit Service' : 'Create Service'}</CardTitle>
                  <CardDescription>Configure laundry item pricing without changing other dashboard modules.</CardDescription>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    required
                  >
                    {categories.length === 0 ? (
                      <option value="">No active categories available</option>
                    ) : (
                      categories.map((category) => (
                        <option key={category._id} value={category.name}>
                          {category.name}
                        </option>
                      ))
                    )}
                  </select>
                  {categories.length === 0 && (
                    <p className="mt-2 text-sm text-amber-600">Please add an active category first from the Categories page.</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Wash Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="washPrice"
                      value={formData.washPrice}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Iron Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="ironPrice"
                      value={formData.ironPrice}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Dry Clean Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="dryCleanPrice"
                      value={formData.dryCleanPrice}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-2">
                  <Button type="submit" variant="primary" disabled={submitting || categories.length === 0} className="flex-1">
                    {submitting ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
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

export default Services;
