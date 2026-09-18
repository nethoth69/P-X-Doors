const STATUSES = ['received', 'confirmed', 'installed', 'completed', 'cancelled'];

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' });
}

function itemsList(order) {
  return `<ul>${order.items.map(item => {
    const specs = item.selections ? Object.values(item.selections).map(s => s.label).join(', ') : '';
    return `<li>${item.name}${specs ? ' — ' + specs : ''} <strong>GHS ${item.lineTotal.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</strong></li>`;
  }).join('')}</ul>`;
}

async function loadOrders() {
  const root = document.getElementById('orders-root');
  const res = await fetch('/api/orders');
  if (!res.ok) {
    root.innerHTML = '<p>Could not load orders.</p>';
    return;
  }
  const { orders } = await res.json();

  if (orders.length === 0) {
    root.innerHTML = '<p>No orders yet.</p>';
    return;
  }

  root.innerHTML = `
    <table class="orders-table">
      <thead>
        <tr>
          <th>Order</th>
          <th>Customer</th>
          <th>Items</th>
          <th>Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(order => `
          <tr data-order="${order.orderNumber}">
            <td>
              <strong>${order.orderNumber}</strong><br>
              <span style="color:var(--ink-soft); font-size:0.82rem;">${formatDate(order.createdAt)}</span>
            </td>
            <td>
              ${order.customer.name}<br>
              <a href="tel:${order.customer.phone}">${order.customer.phone}</a><br>
              ${order.customer.address ? `<span style="color:var(--ink-soft); font-size:0.85rem;">${order.customer.address}</span>` : ''}
            </td>
            <td class="items-cell">${itemsList(order)}</td>
            <td><strong>GHS ${order.total.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</strong></td>
            <td>
              <select class="status-select" data-order="${order.orderNumber}">
                ${STATUSES.map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  root.addEventListener('change', async (e) => {
    const select = e.target.closest('.status-select');
    if (!select) return;
    const orderNumber = select.dataset.order;
    const status = select.value;
    select.disabled = true;
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('update failed');
    } catch (err) {
      alert('Could not update this order. Try again.');
    } finally {
      select.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', loadOrders);
