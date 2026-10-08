/**
 * 首页：分类渲染 + 商品分页列表 / 搜索 / 筛选。
 * 对接 GET /api/products/page，返回 { list, pagination }。
 */
(function () {
  const SIZE = 10;

  const grid = document.getElementById('productGrid');
  const emptyTip = document.getElementById('emptyTip');
  const searchInput = document.getElementById('searchInput');
  const categoryBar = document.getElementById('categoryBar');
  const pager = document.getElementById('pager');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageNoEl = document.getElementById('pageNo');
  const totalPagesEl = document.getElementById('totalPages');
  const pageInfoEl = document.getElementById('pageInfo');

  let currentPage = 1;
  let currentCategoryId = null;
  let pagination = { page: 1, size: SIZE, total: 0, totalPages: 1 };

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
      emptyTip.textContent = '暂无符合条件的商品';
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

  function renderPager() {
    if (pagination.total === 0) {
      pager.hidden = true;
      return;
    }
    pager.hidden = false;
    pageNoEl.textContent = pagination.page;
    totalPagesEl.textContent = pagination.totalPages;
    pageInfoEl.textContent = `共 ${pagination.total} 件`;
    prevBtn.disabled = pagination.page <= 1;
    nextBtn.disabled = pagination.page >= pagination.totalPages;
  }

  async function loadProducts() {
    const params = new URLSearchParams();
    params.set('page', currentPage);
    params.set('size', SIZE);
    const keyword = searchInput.value.trim();
    if (keyword) params.set('keyword', keyword);
    if (currentCategoryId) params.set('categoryId', currentCategoryId);

    try {
      const data = await window.api.get('/products/page?' + params.toString());
      pagination = data.pagination;
      currentPage = pagination.page;
      renderProducts(data.list || []);
      renderPager();
    } catch (err) {
      grid.innerHTML = '';
      pager.hidden = true;
      emptyTip.hidden = false;
      emptyTip.textContent = '商品加载失败：' + err.message;
    }
  }

  // 搜索 / 切换分类都回到第 1 页
  document.getElementById('searchBtn').addEventListener('click', () => { currentPage = 1; loadProducts(); });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { currentPage = 1; loadProducts(); }
  });

  categoryBar.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    categoryBar.querySelectorAll('.chip').forEach(el => el.classList.remove('active'));
    chip.classList.add('active');
    currentCategoryId = chip.dataset.id || null;
    currentPage = 1;
    loadProducts();
  });

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; loadProducts(); }
  });
  nextBtn.addEventListener('click', () => {
    if (currentPage < pagination.totalPages) { currentPage++; loadProducts(); }
  });

  grid.addEventListener('click', e => {
    const card = e.target.closest('.product-card');
    if (card) location.href = 'detail.html?id=' + card.dataset.id;
  });

  renderCategories();
  loadProducts();
})();
