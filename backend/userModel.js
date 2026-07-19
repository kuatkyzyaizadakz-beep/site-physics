const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  toqsan: Number,
  module: String,
  testName: String,
  score: Number,
  totalQuestions: Number,
  date: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  isAdmin: { type: Boolean, default: false },
  testResults: [testResultSchema],
  registrationDate: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema, 'users');
