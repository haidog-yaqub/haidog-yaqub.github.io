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

    $(document).on('shown.bs.collapse', '.publication-cover-collapse', function () {
        if (window.__refreshLazy) {
            window.__refreshLazy();
        }
    });

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

    $(document).on('click', '.publication-tldr-toggle', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var target = $btn.attr('href');
        var $panel = target ? $(target) : $();
        if (!$panel.length) {
            return;
        }
        var open = !$panel.hasClass('is-open');
        $panel.toggleClass('is-open', open);
        $btn.attr('aria-expanded', open);
    });

    $(document).on('click', '.research-highlight-authors-toggle', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var $btn = $(this);
        var $row = $btn.closest('.research-highlight-authors');
        var expanded = !$row.hasClass('is-expanded');
        $row.toggleClass('is-expanded', expanded);
        $row.find('.research-highlight-authors-short').toggle(!expanded);
        $row.find('.research-highlight-authors-full').prop('hidden', !expanded);
        $btn.attr('aria-expanded', expanded);
        $btn.attr('aria-label', expanded ? 'Hide authors' : 'Show all authors');
        $btn.html(expanded
            ? 'et&nbsp;al.<i class="fas fa-angle-up" aria-hidden="true"></i>'
            : 'et&nbsp;al.<i class="fas fa-angle-down" aria-hidden="true"></i>');
    });
    (function () {
        var $box = null;

        function ensureLightbox() {
            if ($box && $box.length) {
                return $box;
            }
            $box = $(
                '<div class="pub-cover-lightbox" hidden>' +
                    '<div class="pub-cover-lightbox-frame">' +
                        '<button type="button" class="pub-cover-lightbox-close" aria-label="Close">' +
                            '<i class="fas fa-times" aria-hidden="true"></i>' +
                        '</button>' +
                        '<img alt="">' +
                        '<video controls muted loop playsinline hidden></video>' +
                    '</div>' +
                '</div>'
            );
            $('body').append($box);
            $box.on('click', function (e) {
                if (e.target === $box[0]) {
                    closeLightbox();
                }
            });
            $box.find('.pub-cover-lightbox-close').on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                closeLightbox();
            });
            return $box;
        }

        function openLightbox(src, alt, isVideo) {
            var $lb = ensureLightbox();
            var $img = $lb.find('img');
            var $video = $lb.find('video');

            if (isVideo) {
                $img.attr({ src: '', alt: '' }).attr('hidden', true);
                $video.attr({ src: src, 'aria-label': alt || '' }).removeAttr('hidden');
                $video[0].load();
                var playPromise = $video[0].play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(function () {});
                }
            } else {
                $video[0].pause();
                $video.attr('src', '').attr('hidden', true);
                $img.attr({ src: src, alt: alt || '' }).removeAttr('hidden');
            }
            $lb.removeAttr('hidden').addClass('is-open');
            $('body').addClass('pub-cover-lightbox-open');
        }

        function closeLightbox() {
            if (!$box) {
                return;
            }
            $box.addClass('is-closing');
            $box.removeClass('is-open');
            $('body').removeClass('pub-cover-lightbox-open');
            window.setTimeout(function () {
                if ($box) {
                    $box.attr('hidden', true).removeClass('is-closing');
                    $box.find('img').attr('src', '');
                    var $video = $box.find('video');
                    $video[0].pause();
                    $video.attr('src', '');
                }
            }, 180);
        }

        $(document).on('click', '.publication-cover-wrap:not(.publication-cover-wrap--sm)', function (e) {
            e.preventDefault();
            var $wrap = $(this);
            var $media = $wrap.find('.publication-cover-thumb').first();
            var src = $media.attr('data-src') || $media.attr('src');
            if (!src) {
                return;
            }
            openLightbox(src, $media.attr('alt') || $media.attr('aria-label'), $media.is('video'));
        });

        $(document).on('keydown.coverLightbox', function (e) {
            if (e.key === 'Escape') {
                closeLightbox();
            }
        });
    })();
})
