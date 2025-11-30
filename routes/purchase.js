const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Purchase = require('../models/Purchase');
const Plan = require('../models/Plan');
const { authenticate, authorizeRoles } = require('../middleware/auth');


router.post('/create', authenticate, async (req, res) => {
  try {
    const { 
      planId,
      firstName,
      lastName,
      email,
      contactNumber,
      businessDetails,
      residentialAddress,
      businessAddress,
      documents
    } = req.body;

    const plan = await Plan.findOne({ planId });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    // Create QR data
    const qrData = `Plan: ${plan.title}\nPrice: ${plan.price}\nClient: ${firstName} ${lastName}`;
    const qrCodeUrl = await QRCode.toDataURL(qrData);

    // Capture plan snapshot
    const planSnapshot = {
      title: plan.title,
      subtitle: plan.subtitle,
      price: plan.price,
      discountPrice: plan.discountPrice,
      billingCycle: plan.billingCycle,
      validityInDays: plan.validityInDays,
      planType: plan.planType,
      supportLevel: plan.supportLevel,
      features: plan.features,
      services: plan.services
    };

    const purchase = new Purchase({
      planId: Number(planId),
      userId: req.user._id,
      firstName,
      lastName,
      email,
      contactNumber,
      businessDetails,
      residentialAddress,
      businessAddress,
      documents,
      qrCodeUrl,
      planSnapshot
    });

    await purchase.save();
    res.status(201).json({ message: 'Purchase created', purchase });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});



router.put('/:id/upload-proof', authenticate, async (req, res) => {
  try {
    const { paymentProofUrl } = req.body;

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    purchase.paymentProofUrl = paymentProofUrl;
    purchase.paymentStatus = 'pending'; // waiting for admin confirmation
    await purchase.save();

    res.json({ message: 'Payment proof uploaded', purchase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.put('/:id/confirm', authenticate, async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    purchase.paymentStatus = 'confirmed';
    await purchase.save();

    res.json({ message: 'Payment confirmed, plan activated', purchase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/my-purchases', authenticate, async (req, res) => {
  try {
    // Step 1: Fetch purchases for the logged-in user
    const purchases = await Purchase.find({ userId: req.user._id })
      .sort({ createdAt: -1 }); // sort by newest first

    // Step 2: Attach plan details manually
    const purchasesWithPlan = await Promise.all(
      purchases.map(async (p) => {
        const plan = await Plan.findOne({ planId: p.planId }); // planId is Number in your schema
        return { ...p.toObject(), plan };
      })
    );

    // Step 3: Send response
    res.json({ purchases: purchasesWithPlan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/all-purchases', authenticate, authorizeRoles('ca', 'admin'), async (req, res) => {
  try {
    const purchases = await Purchase.find().sort({ createdAt: -1 });

    const purchasesWithDetails = await Promise.all(
      purchases.map(async (p) => {
        const plan = await Plan.findOne({ planId: p.planId });

        // Extra business logic fields
        return { 
          ...p.toObject(),
          plan,
          adminNotes: p.adminNotes || "",
          assignedCA: p.assignedCA || null,
          additionalServices: p.additionalServices || [],
        };
      })
    );

    res.json({ purchases: purchasesWithDetails });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
