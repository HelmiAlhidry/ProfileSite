const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const crypto = require('crypto');
const db = require('./db.cjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Allow dynamically loaded base64 images and styles
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '15mb' }));

// Session Tokens Map (Memory Store)
const activeSessions = new Map();

// Helper to clean expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of activeSessions.entries()) {
    if (now > expiry) {
      activeSessions.delete(token);
    }
  }
}, 15 * 60 * 1000);

// Rate Limiters to prevent brute force and spam attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per window
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' }
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 8, // Limit each IP to 8 contact message submissions per hour
  message: { error: 'Too many messages sent. Please try again after an hour.' }
});

// Authentication Middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. Security authentication token missing.' });
  }
  
  const token = authHeader.split(' ')[1];
  const expiry = activeSessions.get(token);
  
  if (!expiry || Date.now() > expiry) {
    activeSessions.delete(token);
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
  
  // Extend session on activity
  activeSessions.set(token, Date.now() + 2 * 60 * 60 * 1000);
  next();
};

/* --- API ENDPOINTS --- */

// 1. Fetch public profile details (Sanitized for security)
app.get('/api/data', async (req, res) => {
  const rawData = await db.getData();
  
  // Create sanitized clone: NEVER send the password hash to the frontend
  const sanitizedData = JSON.parse(JSON.stringify(rawData));
  if (sanitizedData.settings) {
    delete sanitizedData.settings.passcodeHash;
  }
  
  res.json(sanitizedData);
});

// 2. Validate admin passcode
app.post('/api/login', loginLimiter, async (req, res) => {
  const { passcode } = req.body;
  if (!passcode) {
    return res.status(400).json({ error: 'Passcode is required.' });
  }

  const currentDb = await db.getData();
  const inputHash = crypto.createHash('sha256').update(passcode).digest('hex');
  const savedHash = (currentDb.settings && currentDb.settings.passcodeHash) || "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";

  if (inputHash === savedHash) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
    activeSessions.set(token, expiry);
    
    return res.json({ token, success: true });
  } else {
    return res.status(401).json({ error: 'Incorrect passcode.' });
  }
});

// 3. Save admin modifications
app.post('/api/save', requireAuth, async (req, res) => {
  const updatedData = req.body;
  if (!updatedData || typeof updatedData !== 'object') {
    return res.status(400).json({ error: 'Invalid data format.' });
  }

  const currentDb = await db.getData();
  const targetDb = { ...updatedData };

  // Passcode update: hash if typed
  if (updatedData.settings && updatedData.settings.newPasscode) {
    const newPasscodeVal = updatedData.settings.newPasscode.trim();
    if (newPasscodeVal.length < 6) {
      return res.status(400).json({ error: 'New passcode must be at least 6 characters long.' });
    }
    targetDb.settings.passcodeHash = crypto.createHash('sha256').update(newPasscodeVal).digest('hex');
    delete targetDb.settings.newPasscode;
  } else {
    targetDb.settings.passcodeHash = (currentDb.settings && currentDb.settings.passcodeHash) || "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
  }

  // Preserve messages logs
  targetDb.messages = currentDb.messages || [];

  const success = await db.saveData(targetDb);
  if (success) {
    const sanitized = JSON.parse(JSON.stringify(targetDb));
    delete sanitized.settings.passcodeHash;
    return res.json({ success: true, data: sanitized });
  } else {
    return res.status(500).json({ error: 'Failed to write updates to database.' });
  }
});

// 4. Log incoming visitor messages
app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, subject, message } = req.body;
  
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const sanitize = (text) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const currentDb = await db.getData();
  const newMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: sanitize(name),
    email: sanitize(email),
    subject: sanitize(subject || 'General Inquiry'),
    message: sanitize(message),
    date: new Date().toISOString(),
    read: false
  };

  currentDb.messages = [newMessage, ...(currentDb.messages || [])];
  
  const success = await db.saveData(currentDb);
  if (success) {
    return res.json({ success: true });
  } else {
    return res.status(500).json({ error: 'Failed to submit contact message.' });
  }
});

// 5. Delete contact message logs
app.delete('/api/messages/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const currentDb = await db.getData();
  
  const originalCount = currentDb.messages.length;
  currentDb.messages = currentDb.messages.filter(m => m.id !== id);

  if (currentDb.messages.length === originalCount) {
    return res.status(404).json({ error: 'Message log not found.' });
  }

  const success = await db.saveData(currentDb);
  if (success) {
    return res.json({ success: true });
  } else {
    return res.status(500).json({ error: 'Failed to update database.' });
  }
});

// 6. Reset database back to default template
app.post('/api/reset', requireAuth, async (req, res) => {
  const fallbackDb = require('../src/data/defaultData.json');
  const success = await db.saveData(fallbackDb);
  if (success) {
    return res.json({ success: true, data: fallbackDb });
  } else {
    return res.status(500).json({ error: 'Failed to restore default template.' });
  }
});

/* --- STATIC FRONTEND SERVER --- */
app.use(express.static(path.join(__dirname, '../dist')));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start Server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Bilingual portfolio API server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
