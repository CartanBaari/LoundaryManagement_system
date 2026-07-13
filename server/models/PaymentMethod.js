import mongoose from 'mongoose';
import { toSlug } from './ExpenseCategory.js';

const paymentMethodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Method name is required'],
      trim: true,
      unique: true,
      maxlength: [100, 'Method name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense', 'both'],
      default: 'both',
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

paymentMethodSchema.pre('validate', function (next) {
  if (this.name && (!this.slug || this.isModified('name'))) {
    this.slug = toSlug(this.name);
  }
  next();
});

paymentMethodSchema.index({ status: 1, type: 1, name: 1 });

const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);
export default PaymentMethod;
