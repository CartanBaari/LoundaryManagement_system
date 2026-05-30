import User from '../models/User.js';
import Client from '../models/Client.js';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/errorHandler.js';
import { attachRoleToUser, upsertUserRole } from '../utils/userRoleService.js';
import { attachAccountRole, findAccountByEmail } from '../utils/accountService.js';

const generateToken = (id, model) => {
  return jwt.sign({ id, model }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, address } = req.body;

  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, email and password',
    });
  }

  // Check if user already exists
  const normalizedEmail = email.trim().toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });
  let client = await Client.findOne({ email: normalizedEmail });

  if (user || client) {
    return res.status(400).json({
      success: false,
      message: 'User already exists',
    });
  }

  // Create user
  if ((role || 'client') === 'client') {
    client = await Client.create({
      name,
      email: normalizedEmail,
      password,
      phone,
      address,
    });

    user = await attachAccountRole(client, 'Client');
  } else {
    user = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone,
      address,
    });

    await upsertUserRole(user._id, role);
    user = await attachRoleToUser(user);
    user.model = 'User';
  }

  // Generate token
  const token = generateToken(user._id, user.model);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user,
    token,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password',
    });
  }

  // Check if user exists
  const normalizedEmail = email.trim().toLowerCase();
  const { account, model } = await findAccountByEmail(normalizedEmail, true);

  if (!account) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  // Check if password is correct
  const isPasswordCorrect = await account.comparePassword(password);
  if (!isPasswordCorrect) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  // Check if user is active
  if (!account.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been deactivated',
    });
  }

  // Generate token
  const token = generateToken(account._id, model);
  const safeUser = await attachAccountRole(account, model);

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    user: safeUser,
    token,
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const Model = req.user.model === 'Client' ? Client : User;
  const user = await attachAccountRole(await Model.findById(req.user._id), req.user.model);

  res.status(200).json({
    success: true,
    user,
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide current and new password',
    });
  }

  const Model = req.user.model === 'Client' ? Client : User;
  const user = await Model.findById(req.user._id).select('+password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  const isCurrentPasswordValid = await user.comparePassword(currentPassword);

  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect',
    });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});
