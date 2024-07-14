const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  recipient: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['paid', 'unpaid'],
    default: 'unpaid',
  },
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
