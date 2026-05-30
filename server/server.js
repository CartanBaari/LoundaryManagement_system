import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import User from './models/User.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import Service from './models/Service.js';
import categoryRoutes from './routes/categoryRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import Category from './models/Category.js';
import { migrateLegacyUserRoles, upsertUserRole } from './utils/userRoleService.js';
import { migrateLegacyClients } from './utils/accountService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the server directory even when the app
// is started from the project root.
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to database
const initializeData = async () => {
  await seedAdmin();
  await migrateUserRoles();
  await migrateClients();
  await seedCategories();
  await seedServices();
};

// Initialize express app
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware
app.use(errorHandler);

// Add after database connection
const seedAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ email: "admin@example.com" });
    if (!existingAdmin) {
      const admin = await User.create({
        name: "Admin User",
        email: "admin@example.com",
        password: "Admin@123",
        phone: "0000000000",
        address: "Admin Office",
      });
      await upsertUserRole(admin._id, 'admin');
      console.log("Admin user created: admin@example.com / Admin@123");
    } else {
      await upsertUserRole(existingAdmin._id, 'admin');
    }
  } catch (error) {
    console.log("Admin seed error:", error.message);
  }
};

const migrateUserRoles = async () => {
  try {
    const result = await migrateLegacyUserRoles();

    if (result.migrated > 0) {
      console.log(`Migrated ${result.migrated} user roles to the userroles collection`);
    }
  } catch (error) {
    console.log('User role migration error:', error.message);
  }
};

const migrateClients = async () => {
  try {
    const result = await migrateLegacyClients();

    if (result.migrated > 0 || result.updatedOrders > 0 || result.updatedNotifications > 0) {
      console.log(
        `Migrated ${result.migrated} clients, updated ${result.updatedOrders} orders, and updated ${result.updatedNotifications} notifications`
      );
    }
  } catch (error) {
    console.log('Client migration error:', error.message);
  }
};

const seedCategories = async () => {
  try {
    const existingCategories = await Category.countDocuments();

    if (existingCategories > 0) {
      return;
    }

    await Category.insertMany([
      {
        name: 'Men Wear',
        description: 'Laundry categories for men clothing and office garments.',
        status: 'active',
      },
      {
        name: 'Casual Wear',
        description: 'Everyday clothing items for normal wash and ironing.',
        status: 'active',
      },
      {
        name: 'Women Wear',
        description: 'Garments and delicate wear for women clothing lines.',
        status: 'active',
      },
      {
        name: 'Household',
        description: 'Bedsheets, curtains, towels, and other household fabrics.',
        status: 'active',
      },
    ]);

    console.log('Default categories seeded');
  } catch (error) {
    console.log('Category seed error:', error.message);
  }
};

const seedServices = async () => {
  try {
    const existingServices = await Service.countDocuments();

    if (existingServices > 0) {
      return;
    }

    await Service.insertMany([
      { name: 'Shirt', category: 'Men Wear', washPrice: 5, ironPrice: 2, dryCleanPrice: 7, status: 'active' },
      { name: 'T-shirt', category: 'Casual Wear', washPrice: 4, ironPrice: 2, dryCleanPrice: 6, status: 'active' },
      { name: 'Pants', category: 'Men Wear', washPrice: 6, ironPrice: 3, dryCleanPrice: 8, status: 'active' },
      { name: 'Dress', category: 'Women Wear', washPrice: 8, ironPrice: 4, dryCleanPrice: 12, status: 'active' },
      { name: 'Bed Sheet', category: 'Household', washPrice: 10, ironPrice: 4, dryCleanPrice: 14, status: 'active' },
    ]);

    console.log('Default services seeded');
  } catch (error) {
    console.log('Service seed error:', error.message);
  }
};
const startServer = async () => {
  try {
    await connectDB();
    await initializeData();

    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      console.log(` Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Server startup error:', error.message);
    process.exit(1);
  }
};

startServer();



export default app;
