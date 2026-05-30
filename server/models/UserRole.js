import mongoose from 'mongoose';

const userRoleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['admin', 'staff', 'client'],
      default: 'client',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const UserRole = mongoose.model('UserRole', userRoleSchema);

export default UserRole;
