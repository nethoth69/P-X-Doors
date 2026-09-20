require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const { notifyNewOrder, buildWhatsAppLink } = require('./lib/notify');
const { requireAdmin } = require('./lib/adminAuth');
const { passport, googleEnabled } = require('./lib/passportConfig');
const users = require('./lib/users');

const app = express();
const PORT = process.env.PORT || 3000;

const DOORS_PATH = path.join(__dirname, 'data', 'doors.json');
const ORDERS_PATH = path.join(__dirname, 'data', 'orders.json');

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'px-doors-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

// Make sure orders.json exists
if (!fs.existsSync(ORDERS_PATH)) {
  fs.writeFileSync(ORDERS_PATH, JSON.stringify({ orders: [] }, null, 2));
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// GET /api/catalog - full catalog (categories + products)
app.get('/api/catalog', (req, res) => {
  const catalog = readJSON(DOORS_PATH);
  res.json(catalog);
});

// GET /api/doors/:id - a single product
app.get('/api/doors/:id', (req, res) => {
  const catalog = readJSON(DOORS_PATH);
  const product = catalog.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Door not found' });
  res.json({ currency: catalog.currency, product });
});

// POST /api/orders - submit an order (cart + customer details)
// No online payment yet: this records the order for the team to follow up on
app.post('/api/orders', (req, res) => {
  const { customer, items } = req.body;

  if (!customer || !customer.name || !customer.phone) {
    return res.status(400).json({ error: 'Name and phone number are required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  const ordersData = readJSON(ORDERS_PATH);
  const orderNumber = 'PXD-' + Date.now().toString().slice(-8);

  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

  const order = {
    orderNumber,
    createdAt: new Date().toISOString(),
    status: 'received',
    customer: { ...customer, userId: req.user ? req.user.id : null },
    items,
    total
  };

  ordersData.orders.push(order);
  writeJSON(ORDERS_PATH, ordersData);

  // Fire-and-forget: the order is already saved, so a slow or failed
  // notification should never block the customer's confirmation.
  notifyNewOrder(order).catch(() => {});

  res.status(201).json({ orderNumber, total, whatsappLink: buildWhatsAppLink(order) });
});

// ---- Accounts: email/password + Google ----

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

app.get('/api/auth/config', (req, res) => {
  res.json({ googleEnabled });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user ? users.toPublic(req.user) : null });
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !name.trim()) return res.status(400).json({ error: 'Please enter your name.' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  if (users.findByEmail(email)) {
    return res.status(409).json({ error: 'An account with that email already exists. Try logging in instead.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = users.createUser({ name: name.trim(), email, passwordHash });

  req.login(user, (err) => {
    if (err) return res.status(500).json({ error: 'Account created, but signing you in failed. Please log in.' });
    res.status(201).json({ user: users.toPublic(user) });
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = users.findByEmail(email || '');

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'No account with that email and password. If you signed up with Google, use the Google button instead.' });
  }

  const match = await bcrypt.compare(password || '', user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Incorrect email or password.' });

  req.login(user, (err) => {
    if (err) return res.status(500).json({ error: 'Something went wrong logging you in.' });
    res.json({ user: users.toPublic(user) });
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.logout(() => {
    res.json({ ok: true });
  });
});

if (googleEnabled) {
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html?error=google' }),
    (req, res) => res.redirect('/account.html')
  );
} else {
  app.get('/auth/google', (req, res) => {
    res.status(503).send('Google sign-in isn\'t configured yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  });
}

// GET /api/orders/mine - a logged-in customer's own order history
app.get('/api/orders/mine', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Log in to see your orders.' });
  const ordersData = readJSON(ORDERS_PATH);
  const mine = ordersData.orders.filter(o => o.customer && o.customer.userId === req.user.id).reverse();
  res.json({ orders: mine });
});

// ---- Admin area: everything below requires HTTP Basic Auth ----

app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});

// GET /api/orders - list every order, most recent first
app.get('/api/orders', requireAdmin, (req, res) => {
  const ordersData = readJSON(ORDERS_PATH);
  res.json({ orders: [...ordersData.orders].reverse() });
});

// PATCH /api/orders/:orderNumber - update an order's status
const VALID_STATUSES = ['received', 'confirmed', 'installed', 'completed', 'cancelled'];

app.patch('/api/orders/:orderNumber', requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const ordersData = readJSON(ORDERS_PATH);
  const order = ordersData.orders.find(o => o.orderNumber === req.params.orderNumber);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.status = status;
  writeJSON(ORDERS_PATH, ordersData);
  res.json({ order });
});

app.listen(PORT, () => {
  console.log(`PX Doors running at http://localhost:${PORT}`);
});
