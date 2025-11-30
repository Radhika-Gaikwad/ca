// routes/adminStats.js
const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const User = require('../models/User');
const Plan = require('../models/Plan');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// GET /admin/stats
router.get('/', authenticate, authorizeRoles('ca', 'admin'), async (req, res) => {
  try {
    // Total users
    const totalUsers = await User.countDocuments({ role: 'client' });

    // Total purchases
    const totalPurchases = await Purchase.countDocuments();

    // Today's purchases
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const todaysPurchases = await Purchase.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
    });

    // Total plans
    const totalPlans = await Plan.countDocuments();

    // Most selling plans (all plans with their sells)
    const planSales = await Purchase.aggregate([
      { $group: { _id: '$planId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, // sorted by sells descending
    ]);

    // Map plan sales to include plan title
    const allPlansWithSales = await Promise.all(
      planSales.map(async (item) => {
        const plan = await Plan.findOne({ planId: item._id });
        return {
          planId: item._id,
          title: plan?.title || 'Unknown',
          count: item.count,
        };
      })
    );

    // Percentage of confirmed payments
    const confirmedCount = await Purchase.countDocuments({ paymentStatus: 'confirmed' });
    const confirmedPercent = totalPurchases > 0 ? ((confirmedCount / totalPurchases) * 100).toFixed(2) : 0;

    res.json({
      totalUsers,
      totalPurchases,
      todaysPurchases,
      totalPlans,
      allPlansWithSales,
      confirmedPaymentsPercent: confirmedPercent,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
