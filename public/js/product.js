const OPTION_GROUPS = [
  { key: 'size', title: 'Size' },
  { key: 'finish', title: 'Finish' },
  { key: 'installation', title: 'Installation' },
  { key: 'afterService', title: 'After-service' }
];

async function loadProduct() {
  const root = document.getElementById('product-root');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    root.innerHTML = '<p>No door selected. <a href="catalog.html">Back to the catalog</a>.</p>';
    return;
  }

  const res = await fetch(`/api/doors/${id}`);
  if (!res.ok) {
    root.innerHTML = '<p>We could not find that door. <a href="catalog.html">Back to the catalog</a>.</p>';
    return;
  }
  const { currency, product } = await res.json();

  document.title = `${product.name} — Pixelxcript Installations`;

  const selections = {};
  OPTION_GROUPS.forEach(g => { selections[g.key] = product.options[g.key][0]; });

  // Build the photo gallery from the finish options — each finish carries its
  // own representative image. Skip the gallery entirely if every finish
  // happens to share the same photo (nothing to actually choose between).
  const galleryFiles = [...new Set(product.options.finish.map(o => o.image))];
  const hasGallery = galleryFiles.length > 1;

  function currentImage() {
    return selections.finish.image;
  }

  function currentTotal() {
    return OPTION_GROUPS.reduce((sum, g) => sum + selections[g.key].delta, product.basePrice);
  }

  function renderSpecGroup(group) {
    const options = product.options[group.key];
    return `
      <fieldset class="spec-group" data-group="${group.key}">
        <legend>${group.title}</legend>
        <div class="spec-options">
          ${options.map((opt, i) => `
            <label class="spec-option">
              <span class="opt-label">
                <input type="radio" name="${group.key}" value="${opt.id}" ${i === 0 ? 'checked' : ''}>
                ${opt.label}
              </span>
              <span class="opt-delta">${opt.delta > 0 ? '+' + formatMoney(opt.delta, currency) : 'Included'}</span>
            </label>
          `).join('')}
        </div>
      </fieldset>
    `;
  }

  function renderGallery() {
    if (!hasGallery) return '';
    return `
      <div class="photo-gallery" id="photo-gallery">
        ${product.options.finish.map(opt => `
          <button type="button" class="gallery-thumb ${opt.id === selections.finish.id ? 'active' : ''}" data-finish-id="${opt.id}" title="${opt.label}">
            <img src="images/${opt.image}" alt="${product.name} — ${opt.label}">
          </button>
        `).join('')}
      </div>
      <p class="field-hint" style="margin-top:0.6rem;">Pick the photo that matches the finish you want — it'll select that option for you.</p>
    `;
  }

  root.innerHTML = `
    <div class="product-art">
      <img src="images/${currentImage()}" alt="${product.name}" id="main-product-image">
    </div>
    <div class="product-info">
      <span class="category-tag">${product.category.charAt(0).toUpperCase() + product.category.slice(1)} door</span>
      <h1>${product.name}</h1>
      <p>${product.summary}</p>

      ${renderGallery()}

      <div class="spec-list">
        ${OPTION_GROUPS.map(renderSpecGroup).join('')}
      </div>

      <div class="price-summary">
        <span class="label">Total for this door</span>
        <span class="total" id="live-total">${formatMoney(currentTotal(), currency)}</span>
      </div>

      <div class="hero-actions" style="margin-top:1.5rem;">
        <button class="btn btn-primary" id="add-to-cart-btn">Add to cart</button>
        <a class="btn btn-outline" href="catalog.html">Keep browsing</a>
      </div>
      <p class="field-hint" style="margin-top:1rem;">Installation and after-service are arranged once your order is received — no payment is taken online.</p>
    </div>
  `;

  function syncImageAndGallery() {
    document.getElementById('main-product-image').src = `images/${currentImage()}`;
    if (!hasGallery) return;
    document.querySelectorAll('.gallery-thumb').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.finishId === selections.finish.id);
    });
  }

  root.addEventListener('change', (e) => {
    const group = e.target.closest('.spec-group');
    if (!group) return;
    const key = group.dataset.group;
    const opt = product.options[key].find(o => o.id === e.target.value);
    selections[key] = opt;
    document.getElementById('live-total').textContent = formatMoney(currentTotal(), currency);
    if (key === 'finish') syncImageAndGallery();
  });

  if (hasGallery) {
    document.getElementById('photo-gallery').addEventListener('click', (e) => {
      const btn = e.target.closest('.gallery-thumb');
      if (!btn) return;
      const finishId = btn.dataset.finishId;
      const radio = root.querySelector(`input[name="finish"][value="${finishId}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  document.getElementById('add-to-cart-btn').addEventListener('click', () => {
    const cartItem = {
      productId: product.id,
      name: product.name,
      category: product.category,
      image: currentImage(),
      basePrice: product.basePrice,
      selections: { ...selections },
      lineTotal: currentTotal()
    };
    addToCart(cartItem);
    window.location.href = 'cart.html';
  });
}

document.addEventListener('DOMContentLoaded', loadProduct);
