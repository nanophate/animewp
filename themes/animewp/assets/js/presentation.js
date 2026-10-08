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
    if (header && 'ResizeObserver' in window) {
        var first = true;
        var measure = function () {
            var position = window.getComputedStyle(header).position;
            if (position === 'sticky' || position === 'fixed') {
                document.documentElement.style.setProperty('--animewp-sticky-header-height', header.offsetHeight + 'px');
                // A page opened at #anchor jumped before this ran; settle it with the real height.
                var target = first && window.location.hash && document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
                if (target) { target.scrollIntoView(); }
                first = false;
            } else {
                document.documentElement.style.removeProperty('--animewp-sticky-header-height');
            }
        };
        new ResizeObserver(measure).observe(header);
        window.addEventListener('resize', measure, { passive: true });
    }
}());
