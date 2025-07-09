import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import expenseRoutes from './src/routes/expenseRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import { initializeFirebaseAdmin } from './src/config/firebaseAdminConfig.js';

// Load environment variables
dotenv.config();

// Initialize server
const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration for Production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://expenso-9g2i.onrender.com',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    // Allow any Render.com subdomain for development
    if (origin.includes('.onrender.com') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Access-Control-Allow-Methods', 
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Origin',
    'X-Requested-With',
    'Accept'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Middleware
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense-tracker';

// Main server startup function
async function startServer() {
  try {
    // Initialize Firebase Admin
    await initializeFirebaseAdmin();

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');

    // Routes
    app.use('/api/expenses', expenseRoutes);
    app.use('/api/dashboard', dashboardRoutes);

    // Basic health check route
    app.get('/', (req, res) => {
      res.json({ 
        message: 'EXPENSO Backend is running', 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        cors: 'enabled'
      });
    });

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ 
        error: 'Something went wrong!', 
        message: err.message,
        timestamp: new Date().toISOString()
      });
    });

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`EXPENSO Server running on port ${PORT}`);
      console.log(`CORS enabled for origins:`, corsOptions.origin);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        server.close(() => {
          console.log('Server shut down');
          process.exit(0);
        });
      } catch (err) {
        console.error('Error during graceful shutdown:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run the server
startServer();
