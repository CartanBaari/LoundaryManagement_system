export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Wrong MongoDB ID error
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid: ${err.path}`;
    err.statusCode = 400;
    err.message = message;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyValue || {})[0];
    const message = duplicateField
      ? `${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} already exists`
      : 'Duplicate field value entered';
    err.statusCode = 400;
    err.message = message;
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    const message = `Json Web Token is invalid, Try again`;
    err.statusCode = 400;
    err.message = message;
  }

  // JWT expire error
  if (err.name === 'TokenExpiredError') {
    const message = `Json Web Token is expired, Try again`;
    err.statusCode = 400;
    err.message = message;
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { error: err }),
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
