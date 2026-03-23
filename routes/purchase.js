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

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/pay-with-stripe', authenticate, async (req, res) => {
  try {
    const { purchaseId } = req.body;

    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    const plan = purchase.planSnapshot;

    const amount =
      plan.discountPrice && plan.discountPrice > 0
        ? plan.discountPrice
        : plan.price;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid plan amount" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: purchase.email,
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: plan.title || "Plan Purchase",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_ORIGIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_ORIGIN}/payment-cancel`,
      metadata: {
        purchaseId: purchase._id.toString(),
      },
    });

    // ✅ Correct place
    purchase.stripeSessionId = session.id;
    purchase.paymentMethod = "stripe";
    await purchase.save();

    res.json({ url: session.url });

  } catch (err) {
    console.error("Stripe Error:", err);
    res.status(500).json({ message: "Stripe error" });
  }
});

router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log("Webhook Error:", err.message);
    return res.sendStatus(400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const purchaseId = session.metadata.purchaseId;

    const purchase = await Purchase.findById(purchaseId);

    if (purchase && purchase.paymentStatus !== 'confirmed') {
      purchase.paymentStatus = 'confirmed';
      await purchase.save();
    }
  }

  res.json({ received: true });
});
module.exports = router;
