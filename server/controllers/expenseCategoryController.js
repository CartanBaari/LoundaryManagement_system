import ExpenseCategory, { toSlug } from '../models/ExpenseCategory.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const normalizePayload = (body = {}) => {
  const name = String(body.name || '').trim();
  return {
    name,
    slug: body.slug ? toSlug(body.slug) : toSlug(name),
    description: String(body.description || '').trim(),
    status: body.status === 'inactive' ? 'inactive' : 'active',
  };
};

export const getExpenseCategories = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.activeOnly === 'true') {
    filter.status = 'active';
  }

  if (req.query.search) {
    const search = String(req.query.search).trim();
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const categories = await ExpenseCategory.find(filter).sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: categories.length,
    categories,
  });
});

export const createExpenseCategory = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);

  if (!payload.name) {
    return res.status(400).json({
      success: false,
      message: 'Category name is required',
    });
  }

  if (!payload.slug) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category name',
    });
  }

  const existing = await ExpenseCategory.findOne({
    $or: [{ name: payload.name }, { slug: payload.slug }],
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'An expense category with this name already exists',
    });
  }

  const category = await ExpenseCategory.create(payload);

  res.status(201).json({
    success: true,
    message: 'Expense category created successfully',
    category,
  });
});

export const updateExpenseCategory = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);

  if (!payload.name) {
    return res.status(400).json({
      success: false,
      message: 'Category name is required',
    });
  }

  const duplicate = await ExpenseCategory.findOne({
    _id: { $ne: req.params.id },
    $or: [{ name: payload.name }, { slug: payload.slug }],
  });

  if (duplicate) {
    return res.status(400).json({
      success: false,
      message: 'An expense category with this name already exists',
    });
  }

  const category = await ExpenseCategory.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Expense category not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Expense category updated successfully',
    category,
  });
});

export const deleteExpenseCategory = asyncHandler(async (req, res) => {
  const category = await ExpenseCategory.findByIdAndDelete(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Expense category not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Expense category deleted successfully',
  });
});
