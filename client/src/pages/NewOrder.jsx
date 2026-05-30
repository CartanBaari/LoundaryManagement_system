import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { AlertCircle, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, serviceAPI, userAPI } from '../services/api';

const NewOrder = ({ isModal = false, onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [loading, setLoading] = useState(false);
  const [dailyOrderCount, setDailyOrderCount] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [serviceOptions, setServiceOptions] = useState([]);
  const [items, setItems] = useState([{ serviceId: '', itemType: '', serviceName: '', serviceType: 'wash', quantity: 1, price: 0, category: '' }]);
  const [formData, setFormData] = useState({
    customerId: '',
    assignedStaff: '',
    pickupDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    pickupAddress: '',
    deliveryAddress: '',
    notes: '',
  });

  useEffect(() => {
    const checkDailyLimit = async () => {
      try {
        const response = await api.get('/orders');
        const orders = response.data?.orders || [];
        const todayOrders = orders.filter((order) => {
          const orderDate = new Date(order.createdAt).toDateString();
          return orderDate === new Date().toDateString();
        });
        setDailyOrderCount(todayOrders.length);
      } catch (error) {
        console.log('Could not fetch order count');
      }
    };

    checkDailyLimit();
  }, []);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await serviceAPI.getAll({ activeOnly: true });
        const nextServices = response.data?.services || [];
        setServiceOptions(nextServices);

        if (nextServices.length > 0) {
          setItems([buildOrderItem(nextServices[0])]);
        }
      } catch (error) {
        toast.error('Failed to load available services');
      }
    };

    loadServices();
  }, []);

  useEffect(() => {
    const loadAdminOptions = async () => {
      if (!isAdmin) {
        return;
      }

      try {
        const [customersResponse, staffResponse] = await Promise.all([
          userAPI.getAll({ role: 'client' }),
          userAPI.getStaff(),
        ]);

        setCustomers(customersResponse.data?.users || []);
        setStaffMembers(staffResponse.data?.staffMembers || []);
      } catch (error) {
        toast.error('Failed to load customers and staff');
      }
    };

    loadAdminOptions();
  }, [isAdmin]);

  const getServicePrice = (service, serviceType) => {
    if (!service) {
      return 0;
    }

    const priceMap = {
      wash: Number(service.washPrice || 0),
      iron: Number(service.ironPrice || 0),
      dryClean: Number(service.dryCleanPrice || 0),
    };

    return priceMap[serviceType] || 0;
  };

  const buildOrderItem = (service, serviceType = 'wash', quantity = 1) => ({
    serviceId: service?._id || '',
    itemType: service?.name || '',
    serviceName: service?.name || '',
    serviceType,
    quantity,
    price: getServicePrice(service, serviceType),
    category: service?.category || '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (field === 'serviceId') {
          const selectedService = serviceOptions.find((service) => service._id === value);
          return buildOrderItem(selectedService, item.serviceType, item.quantity);
        }

        if (field === 'serviceType') {
          const selectedService = serviceOptions.find((service) => service._id === item.serviceId);
          return {
            ...item,
            serviceType: value,
            price: getServicePrice(selectedService, value),
          };
        }

        if (field === 'quantity') {
          return {
            ...item,
            quantity: Math.max(1, parseInt(value, 10) || 1),
          };
        }

        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  const addItem = () => {
    if (!serviceOptions.length) {
      toast.error('No active services available');
      return;
    }

    setItems((prev) => [...prev, buildOrderItem(serviceOptions[0])]);
  };

  const removeItem = (index) => {
    if (items.length === 1) {
      return;
    }

    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!serviceOptions.length) {
      toast.error('No active services available');
      return;
    }
    
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    if (items.some((item) => !item.serviceId)) {
      toast.error('Please choose a service for every item');
      return;
    }

    if (!formData.pickupAddress || !formData.deliveryAddress) {
      toast.error('Please fill in all addresses');
      return;
    }

    if (isAdmin && !formData.customerId) {
      toast.error('Please select a customer');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items: items.map(item => ({
          serviceId: item.serviceId,
          itemType: item.itemType,
          serviceName: item.serviceName,
          category: item.category,
          serviceType: item.serviceType,
          quantity: item.quantity,
          price: item.price,
        })),
        pickupDate: formData.pickupDate,
        deliveryDate: formData.deliveryDate,
        deliveryNotes: formData.notes,
        totalAmount: calculateTotal(),
        ...(isAdmin ? { userId: formData.customerId } : {}),
        ...(isAdmin && formData.assignedStaff ? { assignedStaff: formData.assignedStaff } : {}),
      };

      await api.post('/orders', orderData);
      toast.success('Order created successfully');
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/orders');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const isLimitExceeded = dailyOrderCount >= 20;
  const minDate = new Date().toISOString().split('T')[0];
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }

    navigate('/orders');
  };

  const formContent = (
    <>
      {isLimitExceeded && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-amber-900">Daily Limit Reached</h3>
            <p className="text-sm text-amber-800 mt-1">
              Today's orders are full (20/20). Your order will be scheduled for tomorrow.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name
              </label>
              <select
                name="customerId"
                value={formData.customerId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                required
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Staff
              </label>
              <select
                name="assignedStaff"
                value={formData.assignedStaff}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
              >
                <option value="">Select staff</option>
                {staffMembers.map((staff) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
          {!serviceOptions.length && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No active services are available yet. Ask an admin to add services in Services Management.
            </div>
          )}
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 p-4 md:grid-cols-[minmax(0,1.3fr)_150px_120px_120px_48px] md:items-end"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item
                  </label>
                  <select
                    value={item.serviceId}
                    onChange={(e) => handleItemChange(index, 'serviceId', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                    disabled={!serviceOptions.length}
                  >
                    {serviceOptions.map((service) => (
                      <option key={service._id} value={service._id}>
                        {service.name} ({service.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type
                  </label>
                  <select
                    value={item.serviceType}
                    onChange={(e) => handleItemChange(index, 'serviceType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                    disabled={!item.serviceId}
                  >
                    <option value="wash">Wash</option>
                    <option value="iron">Iron</option>
                    <option value="dryClean">Dry Clean</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.price}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="h-10 w-10 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  disabled={items.length === 1}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-4 flex items-center gap-2 text-[#2563EB] hover:text-[#1E40AF] font-medium"
          >
            <Plus size={20} />
            Add Item
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl p-5">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
            <span className="text-2xl font-bold text-[#2563EB]">${calculateTotal()}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Date
            </label>
            <input
              type="date"
              name="pickupDate"
              value={formData.pickupDate}
              onChange={handleInputChange}
              min={minDate}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Date
            </label>
            <input
              type="date"
              name="deliveryDate"
              value={formData.deliveryDate}
              onChange={handleInputChange}
              min={minDate}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Address
            </label>
            <textarea
              name="pickupAddress"
              value={formData.pickupAddress}
              onChange={handleInputChange}
              rows={5}
              placeholder="Enter pickup address..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Address
            </label>
            <textarea
              name="deliveryAddress"
              value={formData.deliveryAddress}
              onChange={handleInputChange}
              rows={5}
              placeholder="Enter delivery address..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Special Instructions (Optional)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={4}
            placeholder="Add any special instructions..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !serviceOptions.length}
          >
            {loading ? 'Creating...' : 'Create Order'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </form>
    </>
  );

  return (
    isModal ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Create New Order</CardTitle>
                <CardDescription>Place a new laundry order</CardDescription>
              </div>
              <button
                onClick={handleCancel}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            {formContent}
          </CardContent>
        </Card>
      </div>
    ) : (
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>
          <p className="text-gray-600 mt-1">Place a new laundry order</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>Fill in the form to create a new order</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            {formContent}
          </CardContent>
        </Card>
      </div>
    )
  );
};

export default NewOrder;
