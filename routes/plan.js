const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.post('/', authenticate, authorizeRoles('ca', 'admin'), async (req, res) => {
  try {
    const {
      title,
      subtitle,
      description,
      price,
      discountPrice,
      isDiscountAvailable,
      billingCycle,
      validityInDays,
      planType,
      recommended,
      services,
      features,
      supportLevel,
      maxUsers,
      includesNoticeHandling,
      maxNoticeCount,
      status,
      thumbnail
    } = req.body;

    if (!title || !price) {
      return res.status(400).json({ message: "Title and price are required" });
    }

    const newPlan = new Plan({
      title,
      subtitle,
      description,
      price,
      discountPrice,
      isDiscountAvailable,
      billingCycle,
      validityInDays,
      planType,
      recommended,
      services: services || [],
      features: features || [],
      supportLevel,
      maxUsers,
      includesNoticeHandling,
      maxNoticeCount,
      status,
      thumbnail,
      createdBy: req.user._id
    });

    await newPlan.save();
    res.status(201).json(newPlan);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/', async (req, res) => {
  try {
    const plans = await Plan.find().populate('createdBy', 'name email');
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/:planId', async (req, res) => {
  try {
    const plan = await Plan.findOne({ planId: req.params.planId }).populate('createdBy', 'name email');
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:planId', authenticate, authorizeRoles('ca', 'admin'), async (req, res) => {
  try {
    const {
      title,
      subtitle,
      description,
      price,
      discountPrice,
      isDiscountAvailable,
      billingCycle,
      validityInDays,
      planType,
      recommended,
      services,
      features,
      supportLevel,
      maxUsers,
      includesNoticeHandling,
      maxNoticeCount,
      status,
      thumbnail
    } = req.body;

    const updatedPlan = await Plan.findOneAndUpdate(
      { planId: req.params.planId },
      {
        title,
        subtitle,
        description,
        price,
        discountPrice,
        isDiscountAvailable,
        billingCycle,
        validityInDays,
        planType,
        recommended,
        services,
        features,
        supportLevel,
        maxUsers,
        includesNoticeHandling,
        maxNoticeCount,
        status,
        thumbnail
      },
      { new: true }
    );

    if (!updatedPlan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    res.json(updatedPlan);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



router.delete('/:planId', authenticate, authorizeRoles('ca', 'admin'), async (req, res) => {
  try {
    const plan = await Plan.findOneAndDelete({ planId: req.params.planId });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json({ message: 'Plan deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
