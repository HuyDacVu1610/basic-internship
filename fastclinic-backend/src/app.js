const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const loggerMiddleware = require('./middlewares/loggerMiddleware');
const errorMiddleware = require('./middlewares/errorMiddleware');

const routes = require('./routes');

const app = express();

app.use(cookieParser());

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows resource loading like images/PDFs on frontend
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Request parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request Logger Middleware (runs for all incoming requests)
app.use(loggerMiddleware);

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', routes);

// Centralized error handler middleware (must be registered last)
app.use(errorMiddleware);

module.exports = app;
