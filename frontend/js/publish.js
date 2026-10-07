/**
 * 发布页：上传照片 -> AI 草稿 -> 卖家编辑确认 -> 提交发布。
 * 核心约束：AI 结果只回填到表单（草稿），必须由卖家点击「确认发布」。
 */
(function () {
  const imageInput = document.getElementById('imageInput');
  const aiBtn = document.getElementById('aiBtn');
  const aiTip = document.getElementById('aiTip');
  const form = document.getElementById('publishForm');
  const titleInput = document.getElementById('titleInput');
  const descInput = document.getElementById('descInput');
  const priceInput = document.getElementById('priceInput');
  const refPriceTip = document.getElementById('refPriceTip');
  const categorySelect = document.getElementById('categorySelect');

  async function renderCategoryOptions() {
    try {
      const categories = await window.api.get('/categories');
      categorySelect.innerHTML =
        '<option value="">请选择分类</option>' +
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (err) {
      categorySelect.innerHTML = '<option value="">分类加载失败</option>';
    }
  }

  aiBtn.addEventListener('click', async () => {
    if (!imageInput.files[0]) {
      aiTip.textContent = '请先选择一张物品照片';
      aiTip.className = 'tip error';
      return;
    }

    const formData = new FormData();
    formData.append('image', imageInput.files[0]);

    aiBtn.disabled = true;
    aiTip.textContent = 'AI 生成中…';
    aiTip.className = 'tip';

    try {
      const draft = await window.api.upload('/ai/draft', formData);
      // 仅回填草稿，卖家可自由修改
      titleInput.value = draft.title || '';
      descInput.value = draft.description || '';
      if (draft.referencePrice != null) {
        priceInput.value = draft.referencePrice;
        refPriceTip.textContent = `AI 参考价：¥${draft.referencePrice}，可自行修改`;
      }
      aiTip.textContent = '草稿已生成，请核对修改后再发布';
      aiTip.className = 'tip success';
    } catch (err) {
      // AI 失败不阻断发布：允许手动填写
      aiTip.textContent = 'AI 生成失败（' + err.message + '），可直接手动填写后发布';
      aiTip.className = 'tip error';
    } finally {
      aiBtn.disabled = false;
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      title: titleInput.value.trim(),
      description: descInput.value.trim(),
      price: Number(priceInput.value),
      categoryId: Number(categorySelect.value)
    };

    try {
      await window.api.post('/products', payload);
      location.href = 'index.html';
    } catch (err) {
      alert('发布失败：' + err.message);
    }
  });

  renderCategoryOptions();
})();
