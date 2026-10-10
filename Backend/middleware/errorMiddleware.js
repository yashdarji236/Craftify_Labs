const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  console.error(`[Craftify Auth Error]:`, err);

  // Mongoose bad ObjectId format
  if (err.name === 'CastError') {
    message = 'Resource not found with the specified ID.';
    statusCode = 404;
  }

  // Mongoose duplicate key error (e.g. unique email)
  if (err.code === 11000) {
    message = 'An account with this email already exists.';
    statusCode = 400;
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export default errorHandler;
