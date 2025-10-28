// backend/models/Investor.js
const mongoose = require('mongoose');

const investorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  investmentCapacity: {
    type: Number,
    required: true,
    default: 100000
  },
  riskTolerance: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  preferredCrops: [{
    type: String,
    enum: ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Corn', 'Soybean', 'Potato', 'Tomato', 'Vegetables', 'Fruits', 'Pulses']
  }],
  preferredRegions: [String],
  totalInvested: {
    type: Number,
    default: 0
  },
  totalReturns: {
    type: Number,
    default: 0
  },
  activeInvestments: {
    type: Number,
    default: 0
  },
  completedInvestments: {
    type: Number,
    default: 0
  },
  averageROI: {
    type: Number,
    default: 0
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  kycDocuments: {
    panCard: { type: String, default: '' },
    aadhaar: { type: String, default: '' },
    bankStatement: { type: String, default: '' },
    incomeProof: { type: String, default: '' }
  }
}, {
  timestamps: true
});

// Update investor stats when investments change
investorSchema.methods.updateStats = async function() {
  const Investment = mongoose.model('Investment');
  
  const investments = await Investment.find({ investor: this._id });
  
  this.totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  this.totalReturns = investments
    .filter(inv => inv.actualReturn)
    .reduce((sum, inv) => sum + inv.actualReturn, 0);
  
  this.activeInvestments = investments.filter(inv => inv.status === 'active').length;
  this.completedInvestments = investments.filter(inv => inv.status === 'completed').length;
  
  // Calculate average ROI
  const completedInvestments = investments.filter(inv => inv.status === 'completed' && inv.actualReturn);
  if (completedInvestments.length > 0) {
    const totalROI = completedInvestments.reduce((sum, inv) => {
      return sum + ((inv.actualReturn - inv.amount) / inv.amount) * 100;
    }, 0);
    this.averageROI = totalROI / completedInvestments.length;
  }
  
  await this.save();
};

module.exports = mongoose.model('Investor', investorSchema);