function specSummary(item) {
  if (!item.selections) return '';
  return Object.values(item.selections).map(s => s.label).join(' · ');
}

async function loadAccount() {
  const root = document.getElementById('account-root');
  const res = await fetch('/api/auth/me');
  const { user } = await res.json();

  if (!user) {
    window.location.href = 'login.html?next=account.html';
    return;
  }

  const initial = user.name.trim().charAt(0).toUpperCase();

  root.innerHTML = `
    <div class="account-summary">
      <div class="account-avatar">${initial}</div>
      <div>
        <h2 style="margin-bottom:0.1rem;">${user.name}</h2>
        <p style="margin:0; color:var(--ink-soft); font-size:0.9rem;">${user.email}</p>
      </div>
    </div>
    <button class="btn btn-outline" id="logout-btn">Log out</button>

    <div class="groove"></div>

    <h3>Your orders</h3>
    <div id="orders-list"><p>Loading your orders…</p></div>
  `;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = 'index.html';
  });

  const ordersRes = await fetch('/api/orders/mine');
  const ordersList = document.getElementById('orders-list');

  if (!ordersRes.ok) {
    ordersList.innerHTML = '<p>Could not load your orders right now.</p>';
    return;
  }

  const { orders } = await ordersRes.json();

  if (orders.length === 0) {
    ordersList.innerHTML = `
      <p>No orders yet.</p>
      <a class="btn btn-primary" href="catalog.html">Browse doors</a>
    `;
    return;
  }

  ordersList.innerHTML = orders.map(order => `
    <div class="cart-item" style="grid-template-columns: 1fr auto;">
      <div>
        <h3 style="margin-bottom:0.2rem;">${order.orderNumber}</h3>
        <div class="specs">${new Date(order.createdAt).toLocaleDateString('en-GH', { dateStyle: 'medium' })} &middot; ${order.status}</div>
        <div class="specs" style="margin-top:0.4rem;">
          ${order.items.map(item => `${item.name}${specSummary(item) ? ' — ' + specSummary(item) : ''}`).join('<br>')}
        </div>
      </div>
      <div class="line-total">GHS ${order.total.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', loadAccount);
