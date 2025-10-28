// backend/models/Investment.js
const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  investor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investor',
    required: true
  },
  loan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1000
  },
  expectedReturn: {
    type: Number,
    required: true
  },
  actualReturn: {
    type: Number
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'defaulted', 'partial_return'],
    default: 'active'
  },
  investmentDate: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number,
    required: true
  },
  cropType: {
    type: String,
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  repaymentSchedule: [{
    dueDate: Date,
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending'
    },
    paidDate: Date,
    paidAmount: Number
  }]
}, {
  timestamps: true
});

// Update investor stats when investment is saved
investmentSchema.post('save', async function() {
  const Investor = mongoose.model('Investor');
  const investor = await Investor.findById(this.investor);
  if (investor) {
    await investor.updateStats();
  }
});

module.exports = mongoose.model('Investment', investmentSchema);