import { useState, useCallback, useEffect } from 'react';
import { orderAPI } from '../services/api';

export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderAPI.getAll(params);
      setOrders(response.data.orders);
    } catch (err) {
      console.log(' Error fetching orders:', err.message);
      setError(err.response?.data?.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrderById = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderAPI.getById(id);
      return response.data.order;
    } catch (err) {
      console.log('Error fetching order:', err.message);
      setError(err.response?.data?.message || 'Failed to fetch order');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createOrder = useCallback(async (data) => {
    try {
      setError(null);
      const response = await orderAPI.create(data);
      setOrders((prev) => [response.data.order, ...prev]);
      return response.data;
    } catch (err) {
      console.log(' Error creating order:', err.message);
      setError(err.response?.data?.message || 'Failed to create order');
      throw err;
    }
  }, []);

  const updateOrder = useCallback(async (id, data) => {
    try {
      setError(null);
      const response = await orderAPI.update(id, data);
      setOrders((prev) =>
        prev.map((order) => (order._id === id ? response.data.order : order))
      );
      return response.data;
    } catch (err) {
      console.log('Error updating order:', err.message);
      setError(err.response?.data?.message || 'Failed to update order');
      throw err;
    }
  }, []);

  const deleteOrder = useCallback(async (id) => {
    try {
      setError(null);
      await orderAPI.delete(id);
      setOrders((prev) => prev.filter((order) => order._id !== id));
    } catch (err) {
      console.log('Error deleting order:', err.message);
      setError(err.response?.data?.message || 'Failed to delete order');
      throw err;
    }
  }, []);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    fetchOrderById,
    createOrder,
    updateOrder,
    deleteOrder,
  };
};
