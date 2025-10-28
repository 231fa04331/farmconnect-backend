const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  userType: {
    type: String,
    required: true,
    enum: ['farmer', 'investor']
  },
  // ADD THESE NEW FIELDS:
  phone: {
    type: String,
    trim: true
  },
  farmName: {
    type: String,
    trim: true
  },
  farmLocation: {
    type: String,
    trim: true
  },
  farmSize: {
    type: String,
    trim: true
  },
  cropTypes: {
    type: String,
    trim: true
  }
  // Add to your existing User model

}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);