const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Basic Details
  amount: { type: Number, required: true },
  purpose: { type: String, required: true },
  duration: { type: Number, required: true },
  // Farm Details
  cropType: { type: String, required: true },
  acreage: { type: Number, required: true },
  season: { type: String, required: true },
  expectedYield: { type: Number, required: true },
  // Financial Projections
  expectedMarketPrice: { type: Number, required: true },
  productionCost: { type: Number, required: true },
  expectedProfit: { type: Number, default: 0 },
  // Additional fields
  customPurpose: String,
  customCropType: String,
  // Application Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'completed', 'disbursed'],
    default: 'pending'
  },
  // Timestamps
  appliedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: Date,
  disbursedAt: Date,
  // Additional fields for loan details
  interestRate: { type: Number, default: 12 }, // Default interest rate
  documents: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  progressUpdates: [{
    description: { type: String, required: true },
    photos: [{ type: String }], // Array of photo URLs
    date: {
      type: Date,
      default: Date.now
    }
  }],
  repaymentSchedule: [{
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending'
    },
    paidAt: Date
  }]
}, {
  timestamps: true
});

// Calculate derived fields before saving
loanApplicationSchema.pre('save', function(next) {
  // Calculate expected profit if not provided
  if (!this.expectedProfit && this.expectedYield && this.expectedMarketPrice && this.productionCost) {
    const totalRevenue = this.acreage * this.expectedYield * this.expectedMarketPrice;
    this.expectedProfit = totalRevenue - this.productionCost;
  }
  
  // Ensure documents array is properly formatted
  if (this.documents && Array.isArray(this.documents)) {
    this.documents = this.documents.filter(doc => 
      doc && typeof doc === 'object' && doc.name && doc.url
    );
  }
  
  next();
});

// Add index for better query performance
loanApplicationSchema.index({ user: 1, status: 1 });
loanApplicationSchema.index({ appliedAt: -1 });

module.exports = mongoose.model('Loan', loanApplicationSchema);