// Shared cart storage. The cart lives in localStorage so the customer keeps
// it between pages and visits, right up until they submit an order.

const CART_KEY = 'pxdoors_cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(item) {
  const cart = getCart();
  cart.push(item);
  saveCart(cart);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function cartTotal(cart) {
  return cart.reduce((sum, item) => sum + item.lineTotal, 0);
}

function formatMoney(amount, currency) {
  return `${currency || 'GHS'} ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function updateCartBadge() {
  const badge = document.querySelector('[data-cart-count]');
  if (!badge) return;
  const count = getCart().length;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

document.addEventListener('DOMContentLoaded', updateCartBadge);
