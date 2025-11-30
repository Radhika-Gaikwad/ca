const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({

  planId: { type: Number, ref: 'Plan', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Store plan snapshot so future plan edits do NOT affect old purchases
  planSnapshot: {
    title: String,
    subtitle: String,
    price: Number,
    discountPrice: Number,
    billingCycle: String,
    validityInDays: Number,
    planType: String,
    supportLevel: String,
    features: Array,
    services: Array
  },

  // Universal user information
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  contactNumber: { type: String, required: true },

  // Dynamically required depending on planType
  businessDetails: {
    businessName: String,
    businessType: String,
    gstNumber: String,
    incorporationDate: String,
  },

  // Personal/Address details
  residentialAddress: String,
  businessAddress: String,

  documents: {
    panCardUrl: String,
    aadhaarUrl: String,
    gstCertificateUrl: String,
    businessRegistrationUrl: String,
    pitchDeckUrl: String, // for startup plan
    otherDocuments: [String]
  },

  qrCodeUrl: String,

  paymentStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },

  paymentProofUrl: String,

}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);

