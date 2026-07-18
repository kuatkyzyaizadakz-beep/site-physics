const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  toqsan: Number, // 1, 2, 3, 4
  module: String, // Название модуля (кинематика, динамика и т.д.)
  testName: String,
  score: Number,
  totalQuestions: Number,
  date: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  testResults: [testResultSchema],
  registrationDate: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);