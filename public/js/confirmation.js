document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('order-number');
  if (!el) return;
  const params = new URLSearchParams(window.location.search);
  const order = params.get('order');
  if (order) {
    el.textContent = order;
    const waLink = sessionStorage.getItem('pxdoors_whatsapp_link');
    if (waLink) {
      const waBtn = document.getElementById('whatsapp-link');
      if (waBtn) {
        waBtn.href = waLink;
        waBtn.style.display = 'inline-flex';
      }
      sessionStorage.removeItem('pxdoors_whatsapp_link');
    }
  } else {
    document.querySelector('.confirmation').innerHTML = `
      <h1>No order found</h1>
      <p>We couldn't find an order to confirm. <a href="catalog.html">Browse doors</a> to start a new one.</p>
    `;
  }
});
