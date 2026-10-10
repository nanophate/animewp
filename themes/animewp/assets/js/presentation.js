/* Visual enhancement only. Content is readable before this script runs. */
(function () {
    'use strict';
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!motion.matches && 'IntersectionObserver' in window) {
        var observer;
        var pending = new Set();
        function show(node) { node.removeAttribute('data-animewp-reveal-pending'); pending.delete(node); }
        try {
            observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) { show(entry.target); observer.unobserve(entry.target); }
                });
            }, { threshold: 0.05 });
            document.querySelectorAll('.is-style-animewp-reveal').forEach(function (node) {
                if (node.getBoundingClientRect().top < window.innerHeight) { return; }
                pending.add(node);
                node.setAttribute('data-animewp-reveal-pending', 'true');
                observer.observe(node);
            });
            window.setTimeout(function () { pending.forEach(show); observer.disconnect(); }, 4000);
            motion.addEventListener('change', function () { if (motion.matches) { pending.forEach(show); observer.disconnect(); } });
        } catch (error) { pending.forEach(show); if (observer) { observer.disconnect(); } }
    }
    // A sticky header's real height (logo, illustration, shrink) sets how far
    // in-page links stop below it. Without this, CSS uses the header-height token.
    var header = document.querySelector('header.wp-block-template-part');
    if (header) {
        var heroHeader = header.querySelector('.animewp-header--hero');
        var toolbar = heroHeader && document.getElementById('wpadminbar');
        var first = true;
        var measure = function () {
            if (toolbar) {
                // On small screens Core's toolbar scrolls away. Keep the menu
                // usable above the cover, then remove the gap as it disappears.
                var toolbarOffset = Math.max(0, toolbar.getBoundingClientRect().bottom);
                document.documentElement.style.setProperty('--animewp-sticky-admin-offset', toolbarOffset + 'px');
            }
            var position = window.getComputedStyle(header).position;
            if (position === 'sticky' || position === 'fixed') {
                document.documentElement.style.setProperty('--animewp-sticky-header-height', header.offsetHeight + 'px');
                // A page opened at #anchor jumped before this ran; settle it with the real height.
                if (first) {
                    first = false;
                    var fragment = window.location.hash.slice(1);
                    var target = fragment && document.getElementById(fragment);
                    if (fragment && !target) {
                        // Literal percent signs are valid in IDs; a malformed URI must not break resize updates.
                        try { target = document.getElementById(decodeURIComponent(fragment)); } catch (error) { /* Keep the browser's fragment position. */ }
                    }
                    if (target) { target.scrollIntoView(); }
                }
            } else {
                document.documentElement.style.removeProperty('--animewp-sticky-header-height');
            }
        };
        if ('ResizeObserver' in window) { new ResizeObserver(measure).observe(header); }
        // The new hero header starts as a normal, usable menu until the scroll
        // runtime is ready. Its fixed position can change without a resize.
        document.addEventListener('animewp:scroll-state', measure);
        window.addEventListener('resize', measure, { passive: true });
        if (toolbar) {
            var frame;
            window.addEventListener('scroll', function () {
                if (frame) { return; }
                frame = window.requestAnimationFrame(function () { frame = null; measure(); });
            }, { passive: true });
        }
        measure();
    }
}());
