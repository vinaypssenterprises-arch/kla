require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const prisma = require('./prismaClient');
const { authRouter } = require('./routes/auth');
const petitionsRouter = require('./routes/petitions');
const usersRouter = require('./routes/users');
const districtsRouter = require('./routes/districts');
const officersRouter = require('./routes/officers');
const masterItemsRouter = require('./routes/masterItems');
const dashboardRouter = require('./routes/dashboard');
const designationsRouter = require('./routes/designations');

const app = express();

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Gzip compression — reduces payload size significantly for 1200+ users
app.use(compression());

// Rate limiting — 200 requests per minute per IP (prevents abuse at scale)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});
app.use('/api', limiter);

// Core middleware — allow frontend on AWS and local dev
const allowedOrigins = [
  'http://lokayukta.duckdns.org',
  'http://13.233.160.230',
  'http://13.233.160.230:5173',
  'http://13.233.160.230:3000',
  'http://localhost:5173',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/petitions', petitionsRouter);
app.use('/api/users', usersRouter);
app.use('/api/districts', districtsRouter);
app.use('/api/officers', officersRouter);
app.use('/api/master-items', masterItemsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/designations', designationsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '17-A Backend is running', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ DATABASE CONNECTED SUCCESSFULLY');

    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ DATABASE CONNECTION FAILED');
    console.error(error.message || error);
    process.exit(1);
  }
}

startServer();
