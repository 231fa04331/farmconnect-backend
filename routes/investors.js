// backend/routes/investors.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Investor = require('../models/Investor');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const Loan = require('../models/Loan');
const User = require('../models/User');

// Get investor dashboard stats
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    console.log('📊 Fetching dashboard stats for investor:', req.user._id);
    
    // Find or create investor profile
    let investor = await Investor.findOne({ user: req.user._id });
    if (!investor) {
      investor = new Investor({ user: req.user._id });
      await investor.save();
    }

    // Get investments count by status
    const investments = await Investment.find({ investor: investor._id });
    const activeInvestments = investments.filter(inv => inv.status === 'active').length;
    const completedInvestments = investments.filter(inv => inv.status === 'completed').length;

    // Calculate monthly returns (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const monthlyReturns = await Transaction.aggregate([
      {
        $match: {
          investor: investor._id,
          type: 'return',
          status: 'completed',
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Calculate pending returns from active investments
    const pendingReturns = await Investment.aggregate([
      {
        $match: {
          investor: investor._id,
          status: 'active'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: ['$expectedReturn', '$amount'] } }
        }
      }
    ]);

    const stats = {
      totalInvested: investor.totalInvested,
      totalReturns: investor.totalReturns,
      activeInvestments: activeInvestments,
      completedInvestments: completedInvestments,
      averageROI: investor.averageROI,
      portfolioValue: investor.totalInvested + investor.totalReturns,
      monthlyReturns: monthlyReturns.length > 0 ? monthlyReturns[0].total : 0,
      pendingReturns: pendingReturns.length > 0 ? pendingReturns[0].total : 0
    };

    console.log('📈 Dashboard stats calculated:', stats);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Get investor portfolio
router.get('/portfolio', auth, async (req, res) => {
  try {
    console.log('📋 Fetching portfolio for investor:', req.user._id);
    
    const investor = await Investor.findOne({ user: req.user._id });
    if (!investor) {
      return res.json({
        success: true,
        data: []
      });
    }

    const investments = await Investment.find({ investor: investor._id })
      .populate('loan', 'purpose cropType duration')
      .populate('farmer', 'name')
      .sort({ investmentDate: -1 });

    // Transform data for frontend
    const portfolio = investments.map(inv => ({
      id: inv._id,
      loanId: inv.loan._id,
      farmerId: inv.farmer._id,
      farmerName: inv.farmer.name,
      amount: inv.amount,
      investmentDate: inv.investmentDate,
      expectedReturn: inv.expectedReturn,
      actualReturn: inv.actualReturn,
      status: inv.status,
      duration: inv.duration,
      cropType: inv.loan.cropType,
      riskLevel: inv.riskLevel,
      repaymentSchedule: inv.repaymentSchedule,
      progressUpdates: [] // Will be populated from loan progress updates
    }));

    console.log('📦 Portfolio items found:', portfolio.length);
    
    res.json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    console.error('❌ Portfolio fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Get marketplace loans (available for investment)
router.get('/marketplace-loans', auth, async (req, res) => {
  try {
    console.log('🏪 Fetching marketplace loans');
    
    const {
      minAmount,
      maxAmount,
      cropTypes,
      riskLevels,
      minROI,
      maxDuration,
      regions,
      minCreditScore
    } = req.query;

    // Build filter query
    const filter = { 
      status: 'approved', // Only show approved loans
      'funding.amountFunded': { $lt: '$amount' } // Not fully funded
    };

    if (minAmount) filter.amount = { ...filter.amount, $gte: parseInt(minAmount) };
    if (maxAmount) filter.amount = { ...filter.amount, $lte: parseInt(maxAmount) };
    if (cropTypes) filter.cropType = { $in: Array.isArray(cropTypes) ? cropTypes : [cropTypes] };
    if (maxDuration) filter.duration = { $lte: parseInt(maxDuration) };

    const loans = await Loan.find(filter)
      .populate('user', 'name location experience creditScore')
      .sort({ createdAt: -1 })
      .limit(50);

    // Transform data for frontend
    const marketplaceLoans = loans.map(loan => {
      const amountFunded = loan.funding?.amountFunded || 0;
      const amountRemaining = loan.amount - amountFunded;
      const fundingProgress = (amountFunded / loan.amount) * 100;

      return {
        id: loan._id,
        farmerId: loan.user._id,
        farmer: {
          id: loan.user._id,
          name: loan.user.name,
          location: loan.user.location || 'Unknown Location',
          experience: loan.user.experience || 0,
          creditScore: loan.user.creditScore || 600,
          successfulLoans: loan.user.successfulLoans || 0,
          repaymentRate: loan.user.repaymentRate || 0,
          verificationBadges: loan.user.verificationBadges || []
        },
        amount: loan.amount,
        amountFunded: amountFunded,
        amountRemaining: amountRemaining,
        purpose: loan.purpose,
        duration: loan.duration,
        interestRate: loan.interestRate || 12,
        expectedROI: loan.expectedROI || 15,
        cropType: loan.cropType,
        acreage: loan.acreage,
        season: loan.season,
        expectedYield: loan.expectedYield,
        expectedMarketPrice: loan.expectedMarketPrice,
        riskLevel: loan.riskLevel || 'medium',
        riskFactors: loan.riskFactors || [],
        fundingDeadline: loan.fundingDeadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
        status: fundingProgress >= 100 ? 'funded' : 'funding',
        minimumInvestment: loan.minimumInvestment || 5000,
        investors: loan.investors || [],
        documents: loan.documents || [],
        createdAt: loan.createdAt,
        updatedAt: loan.updatedAt
      };
    });

    console.log('🛒 Marketplace loans found:', marketplaceLoans.length);
    
    res.json({
      success: true,
      data: marketplaceLoans
    });
  } catch (error) {
    console.error('❌ Marketplace loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Make an investment
router.post('/invest/:loanId', auth, async (req, res) => {
  try {
    const { loanId } = req.params;
    const { amount } = req.body;

    console.log('💵 Making investment:', { loanId, amount, investor: req.user._id });

    // Validate amount
    if (!amount || amount < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Minimum investment amount is ₹1000'
      });
    }

    // Find loan
    const loan = await Loan.findById(loanId).populate('user');
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    // Check if loan is available for investment
    const amountFunded = loan.funding?.amountFunded || 0;
    const amountRemaining = loan.amount - amountFunded;
    
    if (amountRemaining < amount) {
      return res.status(400).json({
        success: false,
        message: `Only ₹${amountRemaining} remaining for investment`
      });
    }

    // Find or create investor
    let investor = await Investor.findOne({ user: req.user._id });
    if (!investor) {
      investor = new Investor({ user: req.user._id });
      await investor.save();
    }

    // Calculate expected return (simple interest)
    const expectedReturn = amount * (1 + (loan.interestRate / 100) * (loan.duration / 12));

    // Create investment
    const investment = new Investment({
      investor: investor._id,
      loan: loanId,
      farmer: loan.user._id,
      amount: amount,
      expectedReturn: expectedReturn,
      duration: loan.duration,
      cropType: loan.cropType,
      riskLevel: loan.riskLevel || 'medium'
    });

    await investment.save();

    // Update loan funding
    if (!loan.funding) loan.funding = { amountFunded: 0, investors: [] };
    loan.funding.amountFunded += amount;
    loan.funding.investors.push({
      investorId: investor._id,
      investorName: req.user.name,
      amount: amount,
      investmentDate: new Date()
    });

    // Update loan status if fully funded
    if (loan.funding.amountFunded >= loan.amount) {
      loan.status = 'funded';
    }

    await loan.save();

    // Create transaction record
    const transaction = new Transaction({
      investor: investor._id,
      type: 'investment',
      amount: amount,
      description: `Investment in ${loan.user.name} - ${loan.purpose}`,
      loan: loanId,
      farmer: loan.user._id,
      status: 'completed'
    });

    await transaction.save();

    console.log('✅ Investment created successfully:', investment._id);

    res.json({
      success: true,
      data: {
        investmentId: investment._id,
        message: 'Investment successful!'
      }
    });
  } catch (error) {
    console.error('❌ Investment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Get transactions
router.get('/transactions', auth, async (req, res) => {
  try {
    console.log('💰 Fetching transactions for investor:', req.user._id);
    
    const investor = await Investor.findOne({ user: req.user._id });
    if (!investor) {
      return res.json({
        success: true,
        data: []
      });
    }

    const transactions = await Transaction.find({ investor: investor._id })
      .populate('loan', 'purpose')
      .populate('farmer', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const transformedTransactions = transactions.map(txn => ({
      id: txn._id,
      type: txn.type,
      amount: txn.amount,
      description: txn.description,
      loanId: txn.loan?._id,
      farmerId: txn.farmer?._id,
      farmerName: txn.farmer?.name,
      status: txn.status,
      date: txn.createdAt,
      transactionId: txn.transactionId
    }));

    console.log('📄 Transactions found:', transformedTransactions.length);
    
    res.json({
      success: true,
      data: transformedTransactions
    });
  } catch (error) {
    console.error('❌ Transactions fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Get investor profile
router.get('/profile', auth, async (req, res) => {
  try {
    console.log('👤 Fetching investor profile:', req.user._id);
    
    let investor = await Investor.findOne({ user: req.user._id })
      .populate('user', 'name email');

    if (!investor) {
      // Create profile if doesn't exist
      investor = new Investor({ 
        user: req.user._id,
        preferredCrops: ['Wheat', 'Rice', 'Cotton'],
        preferredRegions: ['Punjab', 'Haryana', 'Maharashtra']
      });
      await investor.save();
      await investor.populate('user', 'name email');
    }

    const profile = {
      id: investor._id,
      userId: investor.user._id,
      name: investor.user.name,
      email: investor.user.email,
      investmentCapacity: investor.investmentCapacity,
      riskTolerance: investor.riskTolerance,
      preferredCrops: investor.preferredCrops,
      preferredRegions: investor.preferredRegions,
      totalInvested: investor.totalInvested,
      totalReturns: investor.totalReturns,
      activeInvestments: investor.activeInvestments,
      averageROI: investor.averageROI,
      verificationStatus: investor.verificationStatus,
      kycDocuments: investor.kycDocuments,
      createdAt: investor.createdAt,
      updatedAt: investor.updatedAt
    };

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Update investor profile
router.put('/profile', auth, async (req, res) => {
  try {
    console.log('✏️ Updating investor profile:', req.user._id);
    
    const {
      investmentCapacity,
      riskTolerance,
      preferredCrops,
      preferredRegions
    } = req.body;

    let investor = await Investor.findOne({ user: req.user._id });
    
    if (!investor) {
      investor = new Investor({ user: req.user._id });
    }

    if (investmentCapacity !== undefined) investor.investmentCapacity = investmentCapacity;
    if (riskTolerance !== undefined) investor.riskTolerance = riskTolerance;
    if (preferredCrops !== undefined) investor.preferredCrops = preferredCrops;
    if (preferredRegions !== undefined) investor.preferredRegions = preferredRegions;

    await investor.save();
    await investor.populate('user', 'name email');

    const profile = {
      id: investor._id,
      userId: investor.user._id,
      name: investor.user.name,
      email: investor.user.email,
      investmentCapacity: investor.investmentCapacity,
      riskTolerance: investor.riskTolerance,
      preferredCrops: investor.preferredCrops,
      preferredRegions: investor.preferredRegions,
      totalInvested: investor.totalInvested,
      totalReturns: investor.totalReturns,
      activeInvestments: investor.activeInvestments,
      averageROI: investor.averageROI,
      verificationStatus: investor.verificationStatus,
      kycDocuments: investor.kycDocuments,
      createdAt: investor.createdAt,
      updatedAt: investor.updatedAt
    };

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

module.exports = router;