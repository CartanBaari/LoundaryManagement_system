import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      required: true,
      enum: [
        'dailyOrderLimit',
        'businessName',
        'businessPhone',
        'businessEmail',
        'businessAddress',
        'systemName',
        'enableNotifications',
      ],
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
