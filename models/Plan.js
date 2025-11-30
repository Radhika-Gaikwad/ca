const mongoose = require('mongoose');
const Counter = require('./Counter');

const planSchema = new mongoose.Schema({
  planId: { type: Number, unique: true },

 
  title: { type: String, required: true },
  subtitle: { type: String },
  description: { type: String },

 
  price: { type: Number, required: true },
  discountPrice: { type: Number, default: 0 },
  isDiscountAvailable: { type: Boolean, default: false },


  billingCycle: {
    type: String,
    enum: ["monthly", "quarterly", "half-yearly", "yearly", "weekly", "one-time"],
    default: "monthly",
  },
  validityInDays: { type: Number }, 


  planType: {
    type: String,
    enum: ["individual", "business", "startup", "premium", "enterprise"],
    default: "individual",
  },


  recommended: { type: Boolean, default: false },


  services: [{ type: String }],

 
  features: [
    {
      name: String,
      included: { type: Boolean, default: true },
    }
  ],

 
  supportLevel: {
    type: String,
    enum: ["email", "phone", "priority", "dedicated CA"],
    default: "email",
  },


  maxUsers: { type: Number, default: 1 },
  includesNoticeHandling: { type: Boolean, default: false },
  maxNoticeCount: { type: Number, default: 0 },


  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },


  thumbnail: { type: String },


  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

}, { timestamps: true });


planSchema.pre('save', async function (next) {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { name: 'planId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.planId = counter.seq;
  }
  next();
});

module.exports = mongoose.model('Plan', planSchema);
