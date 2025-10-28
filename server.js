require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth.js');
const loanRoutes = require('./routes/loans.js');
const investorRoutes = require('./routes/investors');

const app = express();

// ✅ Middleware
app.use(cors({
  origin: 'http://localhost:5173', // your frontend dev URL
  credentials: true
}));
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
