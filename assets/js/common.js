// aHR0cHM6Ly9naXRodWIuY29tL2x1b3N0MjYvYWNhZGVtaWMtaG9tZXBhZ2U=
$(function () {
    lazyLoadOptions = {
        scrollDirection: 'vertical',
        effect: 'fadeIn',
        effectTime: 300,
        placeholder: "",
        onError: function(element) {
            console.log('[lazyload] Error loading ' + element.data('src'));
        },
        afterLoad: function(element) {
            if (element.is('img')) {
                // remove background-image style
                element.css('background-image', 'none');
            } else if (element.is('div')) {
                // set the style to background-size: cover; 
                element.css('background-size', 'cover');
                element.css('background-position', 'center');
            }
        }
    }

    $('img.lazy, div.lazy:not(.always-load)').Lazy({visibleOnly: true, ...lazyLoadOptions});
    $('div.lazy.always-load').Lazy({visibleOnly: false, ...lazyLoadOptions});

    // Expose a tiny hook for pages that dynamically show/hide items (e.g. research filters).
    // When items become visible, Lazy doesn't always rescan automatically.
    window.__refreshLazy = function () {
        try {
            $('img.lazy, div.lazy:not(.always-load)').Lazy('update');
            $('div.lazy.always-load').Lazy('update');
        } catch (e) {
            // no-op (Lazy plugin missing or not initialized yet)
        }
    };

    $('[data-toggle="tooltip"]').tooltip()

    var $grid = $('.grid').masonry({
        "percentPosition": true,
        "itemSelector": ".grid-item",
        "columnWidth": ".grid-sizer"
    });
    // layout Masonry after each image loads
    $grid.imagesLoaded().progress(function () {
        $grid.masonry('layout');
    });

    $(".lazy").on("load", function () {
        $grid.masonry('layout');
    });

    // BibTeX copy to clipboard
    $(document).on('click', '.bibtex-copy', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var $container = $btn.closest('.publication-item-inner, .filter-item');
        var $source = $container.find('.bibtex-source');
        var bibtex;
        if ($source.data('has-bibtex') === 'true' || $source.data('has-bibtex') === true) {
            bibtex = $source.text().trim();
        } else {
            var title = $source.data('title') || '';
            var authors = $source.data('authors') || '';
            var pub = $source.data('pub') || '';
            var year = $source.data('year') || '';
            var citeKey = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[-\s]+/g, '-').substring(0, 30);
            bibtex = '@article{' + citeKey + ',\n  title = {' + title + '},\n  author = {' + authors + '},\n  journal = {' + pub + '},\n  year = {' + year + '}\n}';
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(bibtex).then(function () {
                var orig = $btn.text();
                $btn.text('[Copied!]');
                setTimeout(function () { $btn.text(orig); }, 1500);
            });
        } else {
            var $ta = $('<textarea>').val(bibtex).appendTo('body').select();
            document.execCommand('copy');
            $ta.remove();
            var orig = $btn.text();
            $btn.text('[Copied!]');
            setTimeout(function () { $btn.text(orig); }, 1500);
        }
    });

    // Publication cover: hover preview + jelly in/out. Reparent to body (avoids .filter-item transform).
    // Horizontal center = title column only (.col-md-9, excludes cover); vertical = viewport center.
    (function () {
        var appendTimer = null;
        var openHoverTimer = null;
        var closeHoverTimer = null;

        function getCoverPreviewLayout() {
            var root = document.documentElement;
            var cs = window.getComputedStyle(root);
            function parseVar(name, fallback) {
                var v = cs.getPropertyValue(name).trim();
                if (!v) return fallback;
                var n = parseFloat(v);
                return isNaN(n) ? fallback : n;
            }
            return {
                maxSideRem: parseVar('--pub-cover-preview-max-rem', 32),
                margin: parseVar('--pub-cover-preview-margin-px', 24),
                minSide: parseVar('--pub-cover-preview-min-px', 80)
            };
        }

        var hoverOpenDelay = 400;
        var wrapLeaveCloseDelay = 100;
        var previewLeaveCloseDelay = 50;

        function isCoverPreviewDesktop() {
            return !window.matchMedia('(max-width: 767.98px)').matches;
        }

        function clearOpenHoverTimer() {
            if (openHoverTimer) {
                clearTimeout(openHoverTimer);
                openHoverTimer = null;
            }
        }

        function clearCloseHoverTimer() {
            if (closeHoverTimer) {
                clearTimeout(closeHoverTimer);
                closeHoverTimer = null;
            }
        }

        function unbindPreviewHoverBridge($preview) {
            $preview.off('mouseenter.coverPreviewBridge mouseleave.coverPreviewBridge');
        }

        function scheduleClosePreview($wrap, $preview, delay) {
            clearCloseHoverTimer();
            closeHoverTimer = setTimeout(function () {
                closeHoverTimer = null;
                closeCoverPreview($wrap, $preview);
            }, delay);
        }

        function cancelScheduledClose() {
            clearCloseHoverTimer();
        }

        function bindPreviewHoverBridge($wrap, $preview) {
            unbindPreviewHoverBridge($preview);
            $preview
                .on('mouseenter.coverPreviewBridge', function () {
                    cancelScheduledClose();
                })
                .on('mouseleave.coverPreviewBridge', function () {
                    scheduleClosePreview($wrap, $preview, previewLeaveCloseDelay);
                });
        }

        function positionCoverPreview($p) {
            var L = getCoverPreviewLayout();
            var rootRem = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
            var maxSide = L.maxSideRem * rootRem;
            var vw = window.innerWidth - L.margin * 2;
            var vh = window.innerHeight - L.margin * 2;
            var side = Math.max(L.minSide, Math.floor(Math.min(maxSide, vw, vh)));
            var $wrap = $p.data('ownerWrap');
            var centerX = window.innerWidth / 2;
            if ($wrap && $wrap.length) {
                var $row = $wrap.closest('.row');
                var $titleCol = $row.children('.col-md-9').first();
                if ($titleCol.length && $titleCol[0]) {
                    var tr = $titleCol[0].getBoundingClientRect();
                    centerX = tr.left + tr.width / 2;
                } else {
                    var $box = $wrap.closest('.bg-white.shadow-sm.rounded-xl');
                    if ($box.length && $box[0]) {
                        var br = $box[0].getBoundingClientRect();
                        centerX = br.left + br.width / 2;
                    }
                }
            }
            var centerY = window.innerHeight / 2;
            $p.css({
                width: side + 'px',
                height: side + 'px',
                left: Math.round(centerX) + 'px',
                top: Math.round(centerY) + 'px'
            });
        }

        function unbindCloseListeners() {
            $(document).off('click.coverPreviewBackdrop');
            $(document).off('keydown.coverPreviewEsc');
        }

        function forceCloseAll() {
            clearTimeout(appendTimer);
            appendTimer = null;
            clearOpenHoverTimer();
            clearCloseHoverTimer();
            unbindCloseListeners();
            $('.publication-cover-preview').each(function () {
                var $preview = $(this);
                $preview.off('animationend.coverPreview');
                unbindPreviewHoverBridge($preview);
                if ($preview.hasClass('is-open') || $preview.hasClass('is-closing')) {
                    var $wrap = $preview.data('ownerWrap');
                    $preview.removeClass('is-open is-closing');
                    $preview.removeData('ownerWrap');
                    if ($wrap && $wrap.length) {
                        $wrap.removeData('coverPreviewEl');
                        $wrap.append($preview);
                    }
                }
            });
        }

        function closeCoverPreview($wrap, $preview) {
            if (!$preview || !$preview.length) {
                return;
            }
            if (!$preview.hasClass('is-open') || $preview.hasClass('is-closing')) {
                return;
            }
            unbindPreviewHoverBridge($preview);
            unbindCloseListeners();
            $preview.removeClass('is-open');
            $preview.addClass('is-closing');

            function onAnimEnd(e) {
                var ev = e.originalEvent || e;
                var name = ev.animationName || '';
                if (name.indexOf('pub-cover-preview-jelly-out') === -1 && name.indexOf('pub-cover-preview-fade-out') === -1) {
                    return;
                }
                $preview.off('animationend.coverPreview', onAnimEnd);
                $preview.removeClass('is-closing');
                $preview.removeData('ownerWrap');
                if ($wrap && $wrap.length) {
                    $wrap.removeData('coverPreviewEl');
                    $wrap.append($preview);
                }
            }

            $preview.on('animationend.coverPreview', onAnimEnd);
        }

        function bindCloseListeners($wrap, $preview) {
            $(document).on('click.coverPreviewBackdrop', function (e) {
                if ($(e.target).closest('.publication-cover-preview').length) {
                    return;
                }
                if ($wrap && $wrap.length && $(e.target).closest($wrap).length) {
                    return;
                }
                closeCoverPreview($wrap, $preview);
            });
            $(document).on('keydown.coverPreviewEsc', function (e) {
                if (e.key !== 'Escape') {
                    return;
                }
                closeCoverPreview($wrap, $preview);
            });
        }

        function openCoverPreview($wrap, $preview) {
            forceCloseAll();
            $('body').append($preview);
            $preview.data('ownerWrap', $wrap);
            $wrap.data('coverPreviewEl', $preview);
            positionCoverPreview($preview);
            window.requestAnimationFrame(function () {
                $preview.removeClass('is-closing');
                $preview.addClass('is-open');
            });
            window.setTimeout(function () {
                bindCloseListeners($wrap, $preview);
                bindPreviewHoverBridge($wrap, $preview);
            }, 0);
        }

        $(document).on('mouseenter', '.publication-cover-wrap:not(.publication-cover-wrap--sm)', function () {
            if (!isCoverPreviewDesktop()) {
                return;
            }
            var $wrap = $(this);
            var $p = $wrap.data('coverPreviewEl') || $wrap.children('.publication-cover-preview').first();
            if (!$p.length) {
                return;
            }
            $wrap.data('coverPreviewEl', $p);
            clearOpenHoverTimer();
            openHoverTimer = setTimeout(function () {
                openHoverTimer = null;
                if (!$wrap.is(':hover')) {
                    return;
                }
                if ($p.hasClass('is-open') || $p.hasClass('is-closing')) {
                    return;
                }
                openCoverPreview($wrap, $p);
            }, hoverOpenDelay);
        });

        $(document).on('mouseleave', '.publication-cover-wrap:not(.publication-cover-wrap--sm)', function () {
            if (!isCoverPreviewDesktop()) {
                return;
            }
            var $wrap = $(this);
            var $p = $wrap.data('coverPreviewEl') || $wrap.children('.publication-cover-preview').first();
            clearOpenHoverTimer();
            if ($p.hasClass('is-open')) {
                scheduleClosePreview($wrap, $p, wrapLeaveCloseDelay);
            }
        });

        $(window).on('resize.coverPreview scroll.coverPreview', function () {
            $('.publication-cover-preview.is-open, .publication-cover-preview.is-closing').each(function () {
                positionCoverPreview($(this));
            });
        });
    })();
})
