import PaymentMethod from '../models/PaymentMethod.js';
import { toSlug } from '../models/ExpenseCategory.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const normalizePayload = (body = {}) => {
  const name = String(body.name || '').trim();
  const type = ['income', 'expense', 'both'].includes(body.type) ? body.type : 'both';

  return {
    name,
    slug: body.slug ? toSlug(body.slug) : toSlug(name),
    type,
    description: String(body.description || '').trim(),
    status: body.status === 'inactive' ? 'inactive' : 'active',
  };
};

export const getPaymentMethods = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.activeOnly === 'true') {
    filter.status = 'active';
  }

  if (req.query.type) {
    if (req.query.type === 'income') {
      filter.type = { $in: ['income', 'both'] };
    } else if (req.query.type === 'expense') {
      filter.type = { $in: ['expense', 'both'] };
    } else {
      filter.type = req.query.type;
    }
  }

  if (req.query.search) {
    const search = String(req.query.search).trim();
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const methods = await PaymentMethod.find(filter).sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: methods.length,
    methods,
  });
});

export const createPaymentMethod = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);

  if (!payload.name) {
    return res.status(400).json({
      success: false,
      message: 'Method name is required',
    });
  }

  if (!payload.slug) {
    return res.status(400).json({
      success: false,
      message: 'Invalid method name',
    });
  }

  const existing = await PaymentMethod.findOne({
    $or: [{ name: payload.name }, { slug: payload.slug }],
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'A payment method with this name already exists',
    });
  }

  const method = await PaymentMethod.create(payload);

  res.status(201).json({
    success: true,
    message: 'Payment method created successfully',
    method,
  });
});

export const updatePaymentMethod = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);

  if (!payload.name) {
    return res.status(400).json({
      success: false,
      message: 'Method name is required',
    });
  }

  const duplicate = await PaymentMethod.findOne({
    _id: { $ne: req.params.id },
    $or: [{ name: payload.name }, { slug: payload.slug }],
  });

  if (duplicate) {
    return res.status(400).json({
      success: false,
      message: 'A payment method with this name already exists',
    });
  }

  const method = await PaymentMethod.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!method) {
    return res.status(404).json({
      success: false,
      message: 'Payment method not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Payment method updated successfully',
    method,
  });
});

export const deletePaymentMethod = asyncHandler(async (req, res) => {
  const method = await PaymentMethod.findByIdAndDelete(req.params.id);

  if (!method) {
    return res.status(404).json({
      success: false,
      message: 'Payment method not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Payment method deleted successfully',
  });
});
