function renderCheckoutSummary() {
  const summary = document.getElementById('checkout-summary');
  if (!summary) return;
  const cart = getCart();

  if (cart.length === 0) {
    window.location.href = 'cart.html';
    return;
  }

  const total = cartTotal(cart);
  summary.innerHTML = `
    <h3>Your order</h3>
    ${cart.map(item => `
      <div class="summary-row"><span>${item.name}</span><span>GHS ${item.lineTotal.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span></div>
    `).join('')}
    <div class="summary-row total"><span>Total</span><span>GHS ${total.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span></div>
  `;
}

function initCheckoutForm() {
  const form = document.getElementById('checkout-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cart = getCart();
    if (cart.length === 0) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending order…';

    const customer = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      notes: form.notes.value.trim()
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, items: cart })
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Something went wrong sending your order. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place order';
        return;
      }

      if (data.whatsappLink) {
        sessionStorage.setItem('pxdoors_whatsapp_link', data.whatsappLink);
      }
      clearCart();
      window.location.href = `confirmation.html?order=${encodeURIComponent(data.orderNumber)}`;
    } catch (err) {
      alert('We could not reach the server. Check your connection and try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Place order';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderCheckoutSummary();
  initCheckoutForm();
});
