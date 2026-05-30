import Settings from '../models/Settings.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const defaultSettings = {
  dailyOrderLimit: 20,
  enableNotifications: true,
  systemName: 'LaundryHub',
};

const normalizeSettings = (documents = []) => {
  const settings = { ...defaultSettings };

  documents.forEach((entry) => {
    settings[entry.key] = entry.value;
  });

  return settings;
};

export const getSettings = asyncHandler(async (req, res) => {
  const settingsDocs = await Settings.find({
    key: { $in: Object.keys(defaultSettings) },
  });

  res.status(200).json({
    success: true,
    settings: normalizeSettings(settingsDocs),
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const allowedKeys = Object.keys(defaultSettings);
  const payload = {};

  allowedKeys.forEach((key) => {
    if (req.body[key] !== undefined) {
      payload[key] = req.body[key];
    }
  });

  if (payload.dailyOrderLimit !== undefined) {
    const parsedLimit = Number.parseInt(payload.dailyOrderLimit, 10);

    if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({
        success: false,
        message: 'Daily order limit must be at least 1',
      });
    }

    payload.dailyOrderLimit = parsedLimit;
  }

  if (payload.enableNotifications !== undefined) {
    payload.enableNotifications = Boolean(payload.enableNotifications);
  }

  const updateOperations = Object.entries(payload).map(([key, value]) =>
    Settings.findOneAndUpdate(
      { key },
      {
        key,
        value,
        description: `System setting for ${key}`,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  );

  await Promise.all(updateOperations);

  const settingsDocs = await Settings.find({
    key: { $in: allowedKeys },
  });

  res.status(200).json({
    success: true,
    message: 'Settings updated successfully',
    settings: normalizeSettings(settingsDocs),
  });
});
