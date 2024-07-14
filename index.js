require('dotenv').config();
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const mongoose = require('mongoose');
const User = require('./models/User');
const Invoice = require('./models/Invoice');
const axios = require('axios');
const cors = require('cors');

const app = express();

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

connectDB();

// Middleware
app.use(express.json());

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

// Configure CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Configure Google OAuth strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, cb) => {
    const newUser = {
      googleId: profile.id,
      displayName: profile.displayName,
      email: profile.emails[0].value,
      accessToken: accessToken,
    };

    try {
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        user.accessToken = accessToken;
        user = await user.save();
      } else {
        user = await User.create(newUser);
      }

      return cb(null, user);
    } catch (err) {
      console.error(err);
      return cb(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth endpoints
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(process.env.FRONTEND_URL);
});

app.get('/api/invoices', async (req, res) => {
  
  if (!req.isAuthenticated()) {
   console.log('User not authenticated');
    return res.status(401).send('You need to log in');
  }

  try {
    const invoices = await Invoice.find();
    console.log('Invoices found:', invoices);
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).send('Server error');
  }
});

async function sendInvoiceToZapier(invoice) {
  const zapierWebhookURL = process.env.ZAPIER_WEBHOOK_URL;
  try {
    const response = await axios.post(zapierWebhookURL, invoice);
    console.log(`Zapier response: ${response.status}`);
  } catch (error) {
    console.error(`Error sending data to Zapier: ${error}`);
  }
}

app.get('/api/check-invoices', async (req, res) => {
  
  if (!req.isAuthenticated()) {
   return res.status(401).send('You need to log in');
   }

  const invoices = await Invoice.find({ status: 'unpaid' });
  const now = new Date();

  for (const invoice of invoices) {
    const dueDate = new Date(invoice.dueDate);
    if (dueDate < now) {
      await sendInvoiceToZapier(invoice);
    }
  }

  res.send('Checked invoices for past due.');
});

// Starting the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
