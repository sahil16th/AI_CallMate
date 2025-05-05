const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  phoneNumbers: [String],
  currentIndex: { type: Number, default: 0 },
  prompt: String,
  questions: [[String]],
  responses: [[String]],
  summary: String,
  status: { type: String, default: 'ready' },
});

module.exports = mongoose.model('Call', callSchema);
