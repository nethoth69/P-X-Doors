require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');

const { notifyNewOrder, buildWhatsAppLink } = require('./lib/notify');
const { requireAdmin } = require('./lib/adminAuth');

const app = express();
const PORT = process.env.PORT || 3000;

const DOORS_PATH = path.join(__dirname, 'data', 'doors.json');
const ORDERS_PATH = path.join(__dirname, 'data', 'orders.json');

app.use(express.json());
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
    customer,
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
