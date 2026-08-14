// News list: fixed viewport (~N rows) with manual scroll.
(function () {
  function viewportHeightForRows(root, items, visible) {
    var first = items[0];
    var last = items[visible - 1];
    if (!first || !last) return 0;

    var rootRect = root.getBoundingClientRect();
    var lastRect = last.getBoundingClientRect();
    var cs = window.getComputedStyle(root);
    var padBottom = parseFloat(cs.paddingBottom) || 0;
    var lastMb = parseFloat(window.getComputedStyle(last).marginBottom) || 0;
    return Math.ceil(lastRect.bottom - rootRect.top + lastMb + padBottom);
  }

  function applyNewsScroll(root) {
    if (!root || root.getAttribute('data-static') === 'true') return;

    var items = root.querySelectorAll('.news-scroll-item');
    var visible = parseInt(root.getAttribute('data-visible'), 10) || 5;
    if (items.length <= visible) {
      root.style.maxHeight = '';
      root.style.height = '';
      root.setAttribute('data-static', 'true');
      return;
    }

    var height = viewportHeightForRows(root, items, visible);
    if (!height) return;

    root.style.height = height + 'px';
    root.style.maxHeight = height + 'px';
  }

  function boot() {
    var nodes = document.querySelectorAll('.news-scroll');
    for (var i = 0; i < nodes.length; i++) applyNewsScroll(nodes[i]);
    if (typeof window.refreshAlwaysScrollbars === 'function') {
      window.refreshAlwaysScrollbars();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('load', boot);
  window.addEventListener('resize', boot);
})();
