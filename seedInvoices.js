require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('./models/Invoice');

// Check if MONGO_URI is loaded correctly
console.log('MONGO_URI:', process.env.MONGO_URI);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

// Sample invoices
const invoices = [
  {
    amount: 100,
    dueDate: new Date('2024-08-01'),
    recipient: 'John Doe',
    status: 'unpaid',
  },
  {
    amount: 200,
    dueDate: new Date('2024-09-01'),
    recipient: 'Jane Smith',
    status: 'paid',
  },
  {
    amount: 150,
    dueDate: new Date('2024-07-20'),
    recipient: 'Alice Johnson',
    status: 'unpaid',
  },
];

const seedInvoices = async () => {
  await connectDB();

  try {
    await Invoice.deleteMany();
    console.log('Invoices cleared');

    await Invoice.insertMany(invoices);
    console.log('Invoices added');
    
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

seedInvoices();
