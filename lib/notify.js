const nodemailer = require('nodemailer');

// Notifications are optional. If SMTP env vars aren't set, this just logs to
// the console instead of failing — the order is still saved either way.

function isEmailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.NOTIFY_EMAIL);
}

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function formatOrderText(order) {
  const lines = [
    `New order: ${order.orderNumber}`,
    `Placed: ${order.createdAt}`,
    '',
    `Customer: ${order.customer.name}`,
    `Phone: ${order.customer.phone}`,
    order.customer.email ? `Email: ${order.customer.email}` : null,
    order.customer.address ? `Address: ${order.customer.address}` : null,
    order.customer.notes ? `Notes: ${order.customer.notes}` : null,
    '',
    'Items:',
    ...order.items.map(item => {
      const specs = item.selections
        ? Object.values(item.selections).map(s => s.label).join(', ')
        : '';
      return `- ${item.name}${specs ? ' (' + specs + ')' : ''} — GHS ${item.lineTotal.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
    }),
    '',
    `Total: GHS ${order.total.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`
  ].filter(Boolean);

  return lines.join('\n');
}

async function notifyNewOrder(order) {
  if (!isEmailConfigured()) {
    console.log('[notify] SMTP not configured — skipping email. Order saved as', order.orderNumber);
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const transport = getTransport();
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.NOTIFY_EMAIL,
      subject: `New PX Doors order — ${order.orderNumber}`,
      text: formatOrderText(order)
    });
    return { sent: true };
  } catch (err) {
    console.error('[notify] Failed to send order email:', err.message);
    return { sent: false, reason: 'send_failed' };
  }
}

// Builds a wa.me link pre-filled with the order details, so the team (or the
// customer, from the confirmation page) can open WhatsApp with one tap.
// This is a click-to-chat link, not an automated message — sending WhatsApp
// messages automatically requires the WhatsApp Business Platform, which needs
// its own Meta business account and approval.
function buildWhatsAppLink(order) {
  const number = process.env.NOTIFY_WHATSAPP_NUMBER;
  if (!number) return null;
  const text = encodeURIComponent(`New PX Doors order ${order.orderNumber} from ${order.customer.name} (${order.customer.phone}) — total GHS ${order.total.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`);
  return `https://wa.me/${number}?text=${text}`;
}

module.exports = { notifyNewOrder, buildWhatsAppLink, isEmailConfigured };
