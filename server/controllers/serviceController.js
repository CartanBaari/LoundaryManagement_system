import Service from '../models/Service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const normalizePayload = (body = {}) => ({
  name: String(body.name || '').trim(),
  category: String(body.category || '').trim(),
  washPrice: Number(body.washPrice || 0),
  ironPrice: Number(body.ironPrice || 0),
  dryCleanPrice: Number(body.dryCleanPrice || 0),
  status: body.status === 'inactive' ? 'inactive' : 'active',
});

const validatePayload = (payload) => {
  if (!payload.name) {
    return 'Service name is required';
  }

  if (!payload.category) {
    return 'Category is required';
  }

  const hasValidPrice = [payload.washPrice, payload.ironPrice, payload.dryCleanPrice].some(
    (price) => Number.isFinite(price) && price > 0
  );

  if (!hasValidPrice) {
    return 'At least one service price must be greater than zero';
  }

  return null;
};

export const getServices = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.activeOnly === 'true') {
    filter.status = 'active';
  }

  const services = await Service.find(filter).sort({ createdAt: -1, name: 1 });

  res.status(200).json({
    success: true,
    count: services.length,
    services,
  });
});

export const createService = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);
  const validationError = validatePayload(payload);

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError,
    });
  }

  const service = await Service.create(payload);

  res.status(201).json({
    success: true,
    message: 'Service created successfully',
    service,
  });
});

export const updateService = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);
  const validationError = validatePayload(payload);

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError,
    });
  }

  const service = await Service.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!service) {
    return res.status(404).json({
      success: false,
      message: 'Service not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Service updated successfully',
    service,
  });
});

export const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);

  if (!service) {
    return res.status(404).json({
      success: false,
      message: 'Service not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Service deleted successfully',
  });
});
