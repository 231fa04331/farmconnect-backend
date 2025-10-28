const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan');
const auth = require('../middleware/auth');

// Submit new loan application
router.post('/applications', auth, async (req, res) => {
  try {
    console.log('Received loan application from user:', req.user._id);

    const loanApplication = new Loan({
      ...req.body,
      user: req.user._id,
      status: 'pending'
    });

    const savedApplication = await loanApplication.save();
    
    console.log('Loan application saved successfully:', savedApplication._id);

    res.status(201).json({
      success: true,
      data: {
        applicationId: savedApplication._id
      },
      message: 'Loan application submitted successfully'
    });
  } catch (error) {
    console.error('Loan application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Get all loans for current user
router.get('/my-applications', auth, async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user._id })
      .sort({ appliedAt: -1 });

    res.json({
      success: true,
      data: {
        count: loans.length,
        loans
      }
    });
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// FIXED: MOVE DASHBOARD ROUTES ABOVE SINGLE LOAN ROUTE
// Get dashboard statistics
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    console.log('🔍 Dashboard stats requested by user:', req.user._id);
    
    const userId = req.user._id;
    
    // Check if user ID is valid
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Get all loans for the user
    const loans = await Loan.find({ user: userId });
    console.log('📊 Found loans:', loans.length);
    
    // Calculate statistics
    const totalLoans = loans.length;
    const amountFunded = loans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
    const activeLoans = loans.filter(loan => 
      ['active', 'disbursed', 'approved'].includes(loan.status)
    ).length;
    
    // Calculate repayment rate (based on repayment schedule)
    const allPayments = loans.flatMap(loan => loan.repaymentSchedule || []);
    const totalPayments = allPayments.length;
    const paidPayments = allPayments.filter(payment => payment.status === 'paid').length;
    const repaymentRate = totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0;
    
    console.log('📈 Stats calculated:', { totalLoans, amountFunded, activeLoans, repaymentRate });
    
    res.json({
      success: true,
      data: {
        totalLoans,
        activeLoans,
        amountFunded,
        repaymentRate
      }
    });
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Get recent loan applications for dashboard
router.get('/recent-applications', auth, async (req, res) => {
  try {
    console.log('🔍 Recent applications requested by user:', req.user._id);
    
    const recentLoans = await Loan.find({ user: req.user._id })
      .sort({ appliedAt: -1 })
      .limit(5);

    console.log('📋 Found recent loans:', recentLoans.length);
    
    res.json({
      success: true,
      data: recentLoans
    });
  } catch (error) {
    console.error('❌ Recent applications error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Get single loan details - MOVED TO BOTTOM
router.get('/:id', auth, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    // Check if user owns this loan
    if (loan.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: loan
    });
  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;