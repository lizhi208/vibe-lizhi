/**
 * 详情页：展示商品 + 下单锁定（本期无支付/物流，仅状态流转）。
 */
(function () {
  const box = document.getElementById('detailBox');
  const productId = new URLSearchParams(location.search).get('id');

  const STATUS_TEXT = { ON_SALE: '在售', LOCKED: '已锁定', SOLD: '已成交' };

  async function loadDetail() {
    if (!productId) {
      box.innerHTML = '<p class="tip error">缺少商品 id</p>';
      return;
    }
    try {
      // TODO: 后端 GET /products/:id 实现后对接
      const p = await window.api.get('/products/' + productId);
      render(p);
    } catch (err) {
      box.innerHTML = '<p class="tip error">加载失败：' + err.message + '</p>';
    }
  }

  function render(p) {
    const canOrder = p.status === 'ON_SALE';
    box.innerHTML = `
      <img class="detail-image" src="${p.image_url || ''}" alt="${p.title}"
           onerror="this.style.visibility='hidden'">
      <h1>${p.title}</h1>
      <div class="detail-price">¥${Number(p.price).toFixed(2)}</div>
      <div class="detail-meta">状态：${STATUS_TEXT[p.status] || p.status}</div>
      <p class="detail-desc">${p.description}</p>
      <div class="form-actions" style="margin-top:20px">
        <button id="orderBtn" class="btn btn-primary" ${canOrder ? '' : 'disabled'}>
          ${canOrder ? '我想要（下单锁定）' : STATUS_TEXT[p.status]}
        </button>
      </div>`;

    document.getElementById('orderBtn')?.addEventListener('click', async () => {
      try {
        // TODO: buyerId 接入登录后传入；演示期可由后端写死
        await window.api.post('/orders', { productId: Number(productId), buyerId: 1 });
        alert('下单成功，商品已锁定');
        loadDetail();
      } catch (err) {
        alert('下单失败：' + err.message);
      }
    });
  }

  loadDetail();
})();
