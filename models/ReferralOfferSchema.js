const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReferralOfferSchema = new mongoose.Schema({
    referralCode: {
      type: String,
      required: true,
      unique: true
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    maxUsage: {
      type: Number,
      required: true,
      default: 1
    },
    currentUsage: {
      type: Number,
      default: 0
    },
    validFrom: {
      type: Date,
      required: true
    },
    validTo: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  });
  

  const ReferralOffer = mongoose.model('ReferralOffer', ReferralOfferSchema);
  module.exports = ReferralOffer;
  