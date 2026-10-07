/**
 * 首页：分类渲染 + 商品列表 / 搜索 / 筛选。
 */
(function () {
  const grid = document.getElementById('productGrid');
  const emptyTip = document.getElementById('emptyTip');
  const searchInput = document.getElementById('searchInput');
  const categoryBar = document.getElementById('categoryBar');

  let currentCategoryId = null;

  // 商品状态中文展示
  const STATUS_TEXT = { ON_SALE: '在售', LOCKED: '已锁定', SOLD: '已成交' };

  async function renderCategories() {
    let categories = [];
    try {
      categories = await window.api.get('/categories');
    } catch (err) {
      categories = [];
    }
    categoryBar.innerHTML =
      `<span class="chip active" data-id="">全部</span>` +
      categories.map(c => `<span class="chip" data-id="${c.id}">${c.name}</span>`).join('');
  }

  function renderProducts(list) {
    if (!list.length) {
      grid.innerHTML = '';
      emptyTip.hidden = false;
      return;
    }
    emptyTip.hidden = true;
    grid.innerHTML = list.map(p => `
      <div class="product-card" data-id="${p.id}">
        <div class="thumb">${p.image_url ? `<img src="${p.image_url}" alt="" style="width:100%;height:100%;object-fit:cover">` : '暂无图片'}</div>
        <div class="info">
          <div class="title">${p.title}</div>
          <div class="price">¥${Number(p.price).toFixed(2)}</div>
          <div class="status">${STATUS_TEXT[p.status] || p.status}</div>
        </div>
      </div>`).join('');
  }

  async function loadProducts() {
    const params = new URLSearchParams();
    const keyword = searchInput.value.trim();
    if (keyword) params.set('keyword', keyword);
    if (currentCategoryId) params.set('categoryId', currentCategoryId);

    try {
      const list = await window.api.get('/products?' + params.toString());
      renderProducts(list || []);
    } catch (err) {
      grid.innerHTML = '';
      emptyTip.hidden = false;
      emptyTip.textContent = '商品加载失败：' + err.message;
    }
  }

  document.getElementById('searchBtn').addEventListener('click', loadProducts);
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadProducts(); });

  categoryBar.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    categoryBar.querySelectorAll('.chip').forEach(el => el.classList.remove('active'));
    chip.classList.add('active');
    currentCategoryId = chip.dataset.id || null;
    loadProducts();
  });

  grid.addEventListener('click', e => {
    const card = e.target.closest('.product-card');
    if (card) location.href = 'detail.html?id=' + card.dataset.id;
  });

  renderCategories();
  loadProducts();
})();
