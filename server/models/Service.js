import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    washPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    ironPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    dryCleanPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ name: 1 }, { unique: true });

const Service = mongoose.model('Service', serviceSchema);

export default Service;
