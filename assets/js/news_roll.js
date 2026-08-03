// News list: fixed viewport (~N rows) with manual scroll.
(function () {
  function rowOuterHeight(el) {
    if (!el) return 0;
    var style = window.getComputedStyle(el);
    var mt = parseFloat(style.marginTop) || 0;
    var mb = parseFloat(style.marginBottom) || 0;
    return el.getBoundingClientRect().height + mt + mb;
  }

  function applyNewsScroll(root) {
    if (!root || root.getAttribute('data-static') === 'true') return;

    var items = root.querySelectorAll('.news-scroll-item');
    var visible = parseInt(root.getAttribute('data-visible'), 10) || 4;
    if (items.length <= visible) {
      root.style.maxHeight = '';
      root.style.height = '';
      root.setAttribute('data-static', 'true');
      return;
    }

    var height = 0;
    for (var i = 0; i < visible; i++) {
      height += rowOuterHeight(items[i]);
    }
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
