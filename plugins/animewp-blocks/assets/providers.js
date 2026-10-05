/* Explicit provider normalization. Never accepts arbitrary iframe HTML or hosts. */
(function (root) {
    'use strict';
    function startSeconds(value) {
        if (!value) { return 0; }
        if (/^\d+$/.test(value)) { return Math.min(86400, Number(value)); }
        var match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
        if (!match || !match[0]) { return null; }
        return Math.min(86400, Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0));
    }
    function normalize(source, value) {
        if (typeof value !== 'string' || !/^https:\/\//i.test(value.trim())) { return null; }
        var url;
        try { url = new URL(value.trim()); } catch (error) { return null; }
        if (url.username || url.password || url.port || /[\\\u0000-\u0020\u007f<>"`]/.test(value.trim())) { return null; }
        var host = url.hostname.toLowerCase(), id, match;
        var start = startSeconds(url.searchParams.get('start') || url.searchParams.get('t') || url.hash.replace(/^#t=/, ''));
        if (start === null) { return null; }
        if (source === 'youtube') {
            if (host === 'youtu.be') { id = url.pathname.slice(1); }
            else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].indexOf(host) !== -1) {
                if (url.pathname === '/watch') { id = url.searchParams.get('v'); }
                else { match = /^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname); id = match && match[1]; }
            } else if (host === 'www.youtube-nocookie.com' || host === 'youtube-nocookie.com') {
                match = /^\/embed\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname); id = match && match[1];
            }
            if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) { return null; }
        } else if (source === 'vimeo') {
            if (host === 'vimeo.com' || host === 'www.vimeo.com') { match = /^\/(\d{1,12})\/?$/.exec(url.pathname); }
            else if (host === 'player.vimeo.com') { match = /^\/video\/(\d{1,12})\/?$/.exec(url.pathname); }
            id = match && match[1];
            // Private/unlisted links have another authorization model; keep as links.
            if (!id || url.searchParams.has('h')) { return null; }
        } else { return null; }
        return { provider: source, id: id, start: start, original: value.trim() };
    }
    function embedUrl(provider, id, start) {
        if (!Number.isInteger(start) || start < 0 || start > 86400) { return ''; }
        if (provider === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(id)) {
            return 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&start=' + start;
        }
        if (provider === 'vimeo' && /^\d{1,12}$/.test(id)) {
            return 'https://player.vimeo.com/video/' + id + '?dnt=1#t=' + start + 's';
        }
        return '';
    }
    var api = { normalize: normalize, embedUrl: embedUrl };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    else { root.animewpVideoProviders = api; }
}(typeof window !== 'undefined' ? window : this));
