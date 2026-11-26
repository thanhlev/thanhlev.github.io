/* search.js - client-side search for /search/ (search.md), no library.
   2026-11-27 · new (site review). wiki: http://localhost:3000/wiki/claude/blog_agent#l11
   In: /search.json (path from the script tag's data-index), the box #q, ?q= in the URL.
   Out: up to 20 result cards in #srch-r, the count in #srch-n.
   Rule: every query word must appear somewhere in the post; score per word = title x5, tags x3,
   short_description/result x2, body text x1 (counted once per field, not per occurrence). */
(function () {
  var box = document.getElementById('q'), out = document.getElementById('srch-r'), cnt = document.getElementById('srch-n');
  if (!box) return;
  var src = document.currentScript && document.currentScript.getAttribute('data-index') || '/search.json';
  var idx = null, wait = null;
  // lower case + strip accents (NFD, then drop U+0300..U+036F marks; \u0111 = đ has no mark form), so "lua" finds "lúa"
  function norm(s) { return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd'); }
  function esc(s) { return (s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load() {
    // fetched once; later calls reuse the same promise
    return wait || (wait = fetch(src).then(function (r) { return r.json(); }).then(function (d) {
      idx = d.map(function (p) {
        return { p: p, t: norm(p.title), g: norm((p.tags || []).join(' ')), d: norm(p.short_description + ' ' + p.result), x: norm(p.text) };
      });
    }));
  }
  function run() {
    var q = norm(box.value).split(/\s+/).filter(Boolean);
    if (!q.length) { out.innerHTML = ''; cnt.textContent = ''; return; }
    var hits = [];
    idx.forEach(function (e) {
      var s = 0;
      for (var i = 0; i < q.length; i++) {
        var w = q[i], ws = (e.t.indexOf(w) >= 0 ? 5 : 0) + (e.g.indexOf(w) >= 0 ? 3 : 0) + (e.d.indexOf(w) >= 0 ? 2 : 0) + (e.x.indexOf(w) >= 0 ? 1 : 0);
        if (!ws) return;            // one word missing = not a hit (all words must match)
        s += ws;
      }
      hits.push({ s: s, p: e.p });
    });
    hits.sort(function (a, b) { return b.s - a.s; });
    cnt.textContent = hits.length + (hits.length === 1 ? ' post' : ' posts') + (hits.length > 20 ? ', best 20 shown' : '');
    out.innerHTML = hits.slice(0, 20).map(function (h) {
      var p = h.p;
      return '<a class="srch-c" href="' + esc(p.url) + '"><span class="sn-l">' + esc(p.board_parent || 'note') + '</span><b>' + esc(p.title) + '</b>' +
        (p.short_description ? '<span class="srch-d">' + esc(p.short_description) + '</span>' : '') +
        (p.result ? '<span class="sn-r">' + esc(p.result) + '</span>' : '') + '</a>';
    }).join('');
  }
  var t = null;
  box.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(function () { load().then(run); }, 120);  // 120 ms debounce: no work per keystroke while typing fast
    var u = new URL(location.href); u.searchParams.set('q', box.value); history.replaceState(null, '', u);  // shareable URL
  });
  // "/" focuses the box (as on GitHub), except while typing in a field
  document.addEventListener('keydown', function (ev) {
    var tg = ev.target.tagName;
    if (ev.key === '/' && tg !== 'INPUT' && tg !== 'TEXTAREA' && !ev.target.isContentEditable) { ev.preventDefault(); box.focus(); box.select(); }
  });
  var q0 = new URLSearchParams(location.search).get('q');
  if (q0) { box.value = q0; load().then(run); } else { if (matchMedia('(hover: hover)').matches) box.focus(); load(); }  // no auto-focus on phones: it would pop the keyboard over the page
})();
