// Always-visible scrollbars (macOS overlay scrollbars hide native ones).
(function () {
  var SELECTOR = ".news-scroll, .split-player-list";

  function updateThumb(wrap) {
    var view = wrap._alwaysScrollView;
    var thumb = wrap._alwaysScrollThumb;
    if (!view || !thumb) return;

    var viewH = view.clientHeight;
    var scrollH = view.scrollHeight;
    if (scrollH <= viewH + 1) {
      wrap.classList.add("is-scroll-static");
      return;
    }
    wrap.classList.remove("is-scroll-static");

    var railH = wrap._alwaysScrollRail.clientHeight || viewH;
    var thumbH = Math.max(24, (viewH / scrollH) * railH);
    var maxTop = Math.max(0, railH - thumbH);
    var top = maxTop === 0 ? 0 : (view.scrollTop / (scrollH - viewH)) * maxTop;
    thumb.style.height = thumbH + "px";
    thumb.style.transform = "translateY(" + top + "px)";
  }

  function enhance(view) {
    if (!view || view.dataset.alwaysScroll === "1") return;
    if (view.getAttribute("data-static") === "true") return;

    view.dataset.alwaysScroll = "1";
    view.classList.add("always-scroll-view");

    var wrap = document.createElement("div");
    wrap.className = "always-scroll-wrap";
    view.parentNode.insertBefore(wrap, view);
    wrap.appendChild(view);

    var rail = document.createElement("div");
    rail.className = "always-scroll-rail";
    rail.setAttribute("aria-hidden", "true");
    var thumb = document.createElement("div");
    thumb.className = "always-scroll-thumb";
    rail.appendChild(thumb);
    wrap.appendChild(rail);

    wrap._alwaysScrollView = view;
    wrap._alwaysScrollRail = rail;
    wrap._alwaysScrollThumb = thumb;

    view.addEventListener("scroll", function () {
      updateThumb(wrap);
    }, { passive: true });

    updateThumb(wrap);
  }

  function boot() {
    var nodes = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < nodes.length; i++) enhance(nodes[i]);

    var wraps = document.querySelectorAll(".always-scroll-wrap");
    for (var j = 0; j < wraps.length; j++) updateThumb(wraps[j]);
  }

  window.refreshAlwaysScrollbars = boot;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.addEventListener("load", boot);
  window.addEventListener("resize", boot);
})();
