async function loadCatalog() {
  const grid = document.getElementById('product-grid');
  const filterBar = document.getElementById('filter-bar');
  if (!grid) return;

  const res = await fetch('/api/catalog');
  const catalog = await res.json();

  const params = new URLSearchParams(window.location.search);
  let activeCategory = params.get('category') || 'all';

  function render() {
    const products = activeCategory === 'all'
      ? catalog.products
      : catalog.products.filter(p => p.category === activeCategory);

    grid.innerHTML = products.map(p => `
      <a class="product-card" href="product.html?id=${p.id}">
        <div class="lintel"></div>
        <div class="card-art">${''}<img src="images/${p.image}" alt="${p.name}"></div>
        <div class="card-body">
          <span class="category-tag">${categoryLabel(catalog, p.category)}</span>
          <h3>${p.name}</h3>
          <p>${p.summary}</p>
          <div class="price-row">
            <span>
              <span class="from">From</span>
              <span class="amount">${formatMoney(p.basePrice, catalog.currency)}</span>
            </span>
          </div>
          <span class="btn btn-outline btn-block">Configure this door</span>
        </div>
      </a>
    `).join('');
  }

  function categoryLabel(catalog, id) {
    const cat = catalog.categories.find(c => c.id === id);
    return cat ? cat.label : id;
  }

  if (filterBar) {
    const chips = [{ id: 'all', label: 'All doors' }, ...catalog.categories.map(c => ({ id: c.id, label: c.label }))];
    filterBar.innerHTML = chips.map(c => `
      <button class="filter-chip" data-cat="${c.id}" aria-pressed="${c.id === activeCategory}">${c.label}</button>
    `).join('');

    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-chip');
      if (!btn) return;
      activeCategory = btn.dataset.cat;
      [...filterBar.querySelectorAll('.filter-chip')].forEach(b => b.setAttribute('aria-pressed', b === btn));
      const url = new URL(window.location);
      if (activeCategory === 'all') url.searchParams.delete('category');
      else url.searchParams.set('category', activeCategory);
      window.history.replaceState({}, '', url);
      render();
    });
  }

  render();
}

document.addEventListener('DOMContentLoaded', loadCatalog);
