import User from '../models/User.js';
import Client from '../models/Client.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  attachRoleToUser,
  deleteUserRole,
  findUsersByRoles,
  upsertUserRole,
} from '../utils/userRoleService.js';
import { attachAccountRole, findClientById, findClients } from '../utils/accountService.js';
import { getStaffWorkloads, DEFAULT_DAILY_CAPACITY, parseDateInput } from '../utils/staffWorkloadService.js';

// Create user (Admin only)
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, address, dailyCapacity } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!name || !normalizedEmail || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, email and password',
    });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  const existingClient = await Client.findOne({ email: normalizedEmail });
  if (existingUser || existingClient) {
    return res.status(400).json({
      success: false,
      message: 'Email already in use',
    });
  }

  let userWithRole;

  if ((role || 'client') === 'client') {
    const client = await Client.create({
      name,
      email: normalizedEmail,
      password,
      phone,
      address,
    });

    userWithRole = await attachAccountRole(client, 'Client');
  } else {
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone,
      address,
      ...(role === 'staff'
        ? { dailyCapacity: Math.max(1, Number(dailyCapacity) || DEFAULT_DAILY_CAPACITY) }
        : {}),
    });

    await upsertUserRole(user._id, role);
    userWithRole = await attachRoleToUser(user);
    userWithRole.model = 'User';
  }

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    user: userWithRole,
  });
});

// Get all users (Admin only)
export const getAllUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const users =
    role === 'client'
      ? await findClients()
      : await findUsersByRoles(role ? [role] : ['admin', 'staff']);
  const sortedUsers = users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.status(200).json({
    success: true,
    count: sortedUsers.length,
    users: sortedUsers,
  });
});

// Get single user
export const getUser = asyncHandler(async (req, res) => {
  let user = await attachRoleToUser(await User.findById(req.params.id));

  if (!user) {
    user = await findClientById(req.params.id);
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// Update user
export const updateUser = asyncHandler(async (req, res) => {
  const { name, email, phone, address, role, isActive, dailyCapacity } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  let user = await User.findById(req.params.id);
  let isClientAccount = false;

  if (!user) {
    user = await Client.findById(req.params.id);
    isClientAccount = Boolean(user);
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // Check if trying to update another user's email
  if (normalizedEmail && normalizedEmail !== user.email) {
    const [existingUser, existingClient] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      Client.findOne({ email: normalizedEmail }),
    ]);

    const emailTaken =
      (existingUser && existingUser._id.toString() !== user._id.toString()) ||
      (existingClient && existingClient._id.toString() !== user._id.toString());

    if (emailTaken) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use',
      });
    }
    user.email = normalizedEmail;
  }

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (address) user.address = address;
  if (isActive !== undefined && req.user.role === 'admin') user.isActive = isActive;
  if (dailyCapacity !== undefined && req.user.role === 'admin' && !isClientAccount) {
    user.dailyCapacity = Math.max(1, Number(dailyCapacity) || DEFAULT_DAILY_CAPACITY);
  }

  await user.save();

  if (!isClientAccount && role && req.user.role === 'admin') {
    await upsertUserRole(user._id, role);
  }

  user = isClientAccount
    ? await findClientById(user._id)
    : await attachAccountRole(await User.findById(user._id), 'User');

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    user,
  });
});

// Delete user
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (user) {
    await deleteUserRole(user._id);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  }

  const client = await Client.findByIdAndDelete(req.params.id);

  if (!client) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Client deleted successfully',
  });
});

// Get staff members
export const getStaffMembers = asyncHandler(async (req, res) => {
  const staffMembers = await findUsersByRoles(['staff'], { isActive: true });

  res.status(200).json({
    success: true,
    count: staffMembers.length,
    staffMembers,
  });
});

// Get per-staff daily workload (Admin only)
export const getStaffWorkload = asyncHandler(async (req, res) => {
  const { date, excludeOrderId } = req.query;
  const targetDate = date ? parseDateInput(date) : new Date();

  if (Number.isNaN(targetDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date format. Use YYYY-MM-DD',
    });
  }

  const workloads = await getStaffWorkloads(targetDate, excludeOrderId || null);
  const dateLabel = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

  res.status(200).json({
    success: true,
    date: dateLabel,
    workloads,
  });
});
