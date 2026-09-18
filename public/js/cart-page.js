function specSummary(item) {
  return Object.values(item.selections).map(s => s.label).join(' · ');
}

function renderCartPage() {
  const list = document.getElementById('cart-list');
  const summary = document.getElementById('cart-summary');
  if (!list) return;

  const cart = getCart();

  if (cart.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <h2>Your cart is empty</h2>
        <p>Configure a door and add it here before checking out.</p>
        <a class="btn btn-primary" href="catalog.html">Browse doors</a>
      </div>
    `;
    summary.style.display = 'none';
    return;
  }

  list.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <div class="thumb"><img src="images/${item.image}" alt="${item.name}"></div>
      <div>
        <h3 style="margin-bottom:0.2rem;">${item.name}</h3>
        <div class="specs">${specSummary(item)}</div>
        <button class="remove-btn" data-index="${i}">Remove</button>
      </div>
      <div class="line-total">GHS ${item.lineTotal.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</div>
    </div>
  `).join('');

  const total = cartTotal(cart);
  summary.innerHTML = `
    <h3>Order summary</h3>
    ${cart.map(item => `
      <div class="summary-row"><span>${item.name}</span><span>GHS ${item.lineTotal.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span></div>
    `).join('')}
    <div class="summary-row total"><span>Total</span><span>GHS ${total.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span></div>
    <a class="btn btn-primary btn-block" style="margin-top:1.2rem;" href="checkout.html">Proceed to checkout</a>
    <p class="field-hint" style="margin-top:0.8rem;">No payment is taken here. We'll confirm final details and arrange payment when we reach out.</p>
  `;

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-btn');
    if (!btn) return;
    removeFromCart(Number(btn.dataset.index));
    renderCartPage();
  });
}

document.addEventListener('DOMContentLoaded', renderCartPage);
