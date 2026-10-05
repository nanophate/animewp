/* Progressive enhancement: the saved video remains usable without this file. */
(function () {
    'use strict';

    function animewpEnhanceVideos() {
        if (typeof window.HTMLDialogElement === 'undefined' ||
            typeof window.HTMLDialogElement.prototype.showModal !== 'function') { return; }
        var animewpSequence = 0;
        document.querySelectorAll('.wp-block-animewp-video').forEach(function (root) {
            if (root.dataset.animewpEnhanced === 'true') { return; }
            var trigger = root.querySelector(':scope > .animewp-video__trigger');
            var fallback = root.querySelector(':scope > .animewp-video__fallback');
            var video = fallback && fallback.querySelector('video');
            var provider = trigger && trigger.dataset.animewpProvider;
            var embed = provider && window.animewpVideoProviders && window.animewpVideoProviders.embedUrl(provider, trigger.dataset.animewpVideoId || '', Number(trigger.dataset.animewpStart || 0));
            if (!trigger || !fallback || (!embed && (!video || !video.getAttribute('src')))) { return; }
            var posterImage = null;
            var poster = null;
            if (embed && !video) {
                posterImage = Array.prototype.find.call(fallback.querySelectorAll(':scope > img'), function (image) {
                    var source = image.getAttribute('src');
                    if (!source || /[\\\u0000-\u0020\u007f<>"`]/.test(source)) { return false; }
                    try {
                        var imageUrl = new URL(source, document.baseURI);
                        return /^(?:http:|https:)$/.test(imageUrl.protocol) &&
                            !imageUrl.username && !imageUrl.password &&
                            imageUrl.origin === window.location.origin;
                    } catch (error) { return false; }
                }) || null;
                if (posterImage) {
                    poster = document.createElement('div');
                    poster.className = 'animewp-video__poster';
                    fallback.insertBefore(poster, posterImage);
                    poster.appendChild(posterImage);
                    poster.appendChild(trigger);
                }
            }
            var frame = null;

            var dialog = document.createElement('dialog');
            var close = document.createElement('button');
            var description = root.querySelector(':scope > .animewp-video__description');
            var id;
            do { id = 'animewp-video-dialog-' + (++animewpSequence); } while (document.getElementById(id));
            dialog.id = id;
            dialog.className = 'animewp-video__dialog';
            dialog.setAttribute('aria-label', trigger.textContent.trim() || '動画');
            close.type = 'button';
            close.className = 'animewp-video__close';
            close.textContent = trigger.dataset.animewpCloseLabel || '閉じる';
            dialog.appendChild(close);
            if (video) { dialog.appendChild(video); }
            if (description && description.textContent.trim()) {
                var dialogDescription = document.createElement('p');
                dialogDescription.id = id + '-description';
                dialogDescription.className = 'animewp-video__dialog-description';
                dialogDescription.textContent = description.textContent;
                dialog.appendChild(dialogDescription);
                dialog.setAttribute('aria-describedby', dialogDescription.id);
            }
            root.appendChild(dialog);
            trigger.setAttribute('aria-haspopup', 'dialog');
            trigger.setAttribute('aria-controls', id);
            trigger.setAttribute('aria-expanded', 'false');
            fallback.hidden = !!video;
            trigger.hidden = false;
            root.dataset.animewpEnhanced = 'true';

            function guardFocus(event) {
                // showModal supplies native Tab trapping and an inert background.
                // Also restore focus if another script attempts to focus outside.
                if (dialog.open && !dialog.contains(event.target)) { close.focus(); }
            }
            function restoreFallback() {
                document.removeEventListener('focusin', guardFocus);
                if (video) { video.pause(); fallback.appendChild(video); }
                if (frame) { frame.remove(); frame = null; }
                fallback.hidden = false;
                trigger.hidden = true;
                dialog.remove();
            }
            trigger.addEventListener('click', function () {
                try {
                    dialog.showModal();
                    if (embed && !frame) {
                        frame = document.createElement('iframe');
                        frame.className = 'animewp-video__frame';
                        frame.title = trigger.textContent.trim() || '動画プレーヤー';
                        frame.allow = 'fullscreen; picture-in-picture';
                        frame.setAttribute('allowfullscreen', '');
                        frame.referrerPolicy = 'strict-origin-when-cross-origin';
                        frame.src = embed;
                        close.insertAdjacentElement('afterend', frame);
                    }
                    trigger.setAttribute('aria-expanded', 'true');
                    document.addEventListener('focusin', guardFocus);
                    close.focus({ preventScroll: true });
                } catch (error) {
                    restoreFallback();
                }
            });
            close.addEventListener('click', function () { dialog.close(); });
            // Escape dispatches native cancel, then close. Do not suppress it.
            dialog.addEventListener('cancel', function () { if (video) { video.pause(); } });
            dialog.addEventListener('close', function () {
                document.removeEventListener('focusin', guardFocus);
                if (video) { video.pause(); }
                if (frame) { frame.remove(); frame = null; }
                trigger.setAttribute('aria-expanded', 'false');
                if (trigger.isConnected) { trigger.focus({ preventScroll: true }); }
            });
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', animewpEnhanceVideos, { once: true });
    } else {
        animewpEnhanceVideos();
    }
}());
