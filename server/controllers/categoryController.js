import Category from '../models/Category.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const normalizePayload = (body = {}) => ({
  name: String(body.name || '').trim(),
  description: String(body.description || '').trim(),
  status: body.status === 'review' ? 'review' : 'active',
});

export const getCategories = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.activeOnly === 'true') {
    filter.status = 'active';
  }

  const categories = await Category.find(filter).sort({ createdAt: -1, name: 1 });

  res.status(200).json({
    success: true,
    count: categories.length,
    categories,
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);

  if (!payload.name || !payload.description) {
    return res.status(400).json({
      success: false,
      message: 'Category name and description are required',
    });
  }

  const category = await Category.create(payload);

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    category,
  });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);

  if (!payload.name || !payload.description) {
    return res.status(400).json({
      success: false,
      message: 'Category name and description are required',
    });
  }

  const category = await Category.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    category,
  });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
  });
});
