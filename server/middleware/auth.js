import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Client from '../models/Client.js';
import { attachAccountRole } from '../utils/accountService.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const modelName = decoded.model === 'Client' ? 'Client' : 'User';
      const Model = modelName === 'Client' ? Client : User;
      const user = await Model.findById(decoded.id);
      req.user = await attachAccountRole(user, modelName);

      if (!req.user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (req.user.isActive === false) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated',
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};
