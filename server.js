require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth.js');
const loanRoutes = require('./routes/loans.js');
const investorRoutes = require('./routes/investors');

const app = express();

// ✅ CORS Configuration - Supports multiple origins (local + production)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://farmconnect-beta.vercel.app',
  'https://farmconnect-frontend.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove undefined values

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('🚫 Blocked by CORS:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/investors', investorRoutes);

// ✅ Test route (useful for checking deployment)
app.get('/', (req, res) => {
  res.send('Backend deployed successfully on Vercel!');
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// ✅ MongoDB connection
mongoose.connect(process.env.MONGODB_URI )
  .then(() => console.log('Connected to MongoDB - formconnect database'))
  .catch(err => console.error('MongoDB connection error:', err));

// ✅ Export app for Vercel
module.exports = app;

// ✅ Local environment check (only runs locally)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}
