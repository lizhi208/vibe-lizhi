/**
 * 统计看板：ECharts 渲染分类分布（饼图）+ 状态分布（柱状图）+ 页面访问量。
 * 数据来源：GET /api/stats/overview、GET /api/stats/visits
 */
(function () {
  const STATUS_TEXT = { ON_SALE: '在售', LOCKED: '已锁定', SOLD: '已成交' };

  function el(id) { return document.getElementById(id); }

  function initChart(id) {
    const node = el(id);
    if (!node) return null;
    if (typeof echarts === 'undefined') {
      node.innerHTML = '<p style="color:#c0392b;padding:20px;">ECharts 加载失败（CDN 不可用或网络问题）</p>';
      return null;
    }
    return echarts.init(node);
  }

  async function renderOverview() {
    let data;
    try {
      data = await window.api.get('/stats/overview');
    } catch (err) {
      el('totalCount').textContent = '加载失败';
      console.error('overview 加载失败:', err);
      return;
    }
    el('totalCount').textContent = data.total;

    // 分类分布：饼图
    const pie = initChart('categoryChart');
    if (pie) {
      pie.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} 件（{d}%）' },
        legend: { bottom: 0 },
        series: [{
          type: 'pie',
          radius: ['40%', '68%'],
          center: ['50%', '46%'],
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { formatter: '{b}\n{c} 件' },
          data: data.byCategory
        }]
      });
    }

    // 状态分布：柱状图
    const bar = initChart('statusChart');
    if (bar) {
      bar.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 40, right: 20, top: 30, bottom: 40 },
        xAxis: {
          type: 'category',
          data: data.byStatus.map(s => STATUS_TEXT[s.status] || s.status)
        },
        yAxis: { type: 'value', minInterval: 1 },
        series: [{
          type: 'bar',
          barWidth: 46,
          itemStyle: { color: '#2563eb', borderRadius: [6, 6, 0, 0] },
          label: { show: true, position: 'top' },
          data: data.byStatus.map(s => s.count)
        }]
      });
    }

    // 自适应
    window.addEventListener('resize', () => {
      if (pie) pie.resize();
      if (bar) bar.resize();
    });
  }

  async function renderVisits() {
    let visits;
    try {
      visits = await window.api.get('/stats/visits');
    } catch (err) {
      console.error('visits 加载失败:', err);
      return;
    }

    const chart = initChart('visitChart');
    if (chart) {
      chart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 50, right: 20, top: 20, bottom: 60 },
        xAxis: { type: 'category', data: visits.map(v => v.path), axisLabel: { rotate: 20 } },
        yAxis: { type: 'value', minInterval: 1 },
        series: [{
          type: 'bar',
          barWidth: 34,
          itemStyle: { color: '#10b981', borderRadius: [6, 6, 0, 0] },
          label: { show: true, position: 'top' },
          data: visits.map(v => v.views)
        }]
      });
      window.addEventListener('resize', () => chart.resize());
    }

    const tbody = document.querySelector('#visitTable tbody');
    tbody.innerHTML = visits.map(v =>
      `<tr><td>${v.path}</td><td>${v.views}</td></tr>`
    ).join('') || '<tr><td colspan="2">暂无访问记录</td></tr>';
  }

  renderOverview();
  renderVisits();
})();
