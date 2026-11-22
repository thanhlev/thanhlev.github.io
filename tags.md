---
layout: default
title: "Tags"
short_description: "Every post, filtered by tag"
permalink: /tags/
wide: true
---
{% comment %}
tags.md - tag filter page (2026-11-22, user «tôi muốn có chức năng filter bài viết theo tag»).
Lists every published post of the four collections that has `tags:` (written by
~/new_ws/social/blog/tools/tag_posts.py or by hand) as cards with data-tags. The buttons are built
from the tags actually used, with counts; clicking one filters the cards in the browser (no plugin,
GitHub Pages safe mode). The choice is kept in the URL hash (#freertos, #esp32+usb) so a tag link
from a post header opens the page already filtered. Several tags = posts that have ALL of them.
{% endcomment %}
{% assign all = site.embedded | concat: site.robotics | concat: site.linux_networking | concat: site.linux_general | where_exp: "i", "i.publish != false" | where_exp: "i", "i.tags.size > 0" %}
{% assign taglist = "" %}{% for p in all %}{% for t in p.tags %}{% assign taglist = taglist | append: t | append: "|" %}{% endfor %}{% endfor %}
{% assign uniq = taglist | split: "|" | uniq | sort %}

<section class="hero">
  <div class="l">
    <div class="pn">INDEX · TAGS · {{ all.size }} POSTS</div>
    <h1>Filter by <em>tag</em>.</h1>
    <p>Pick one tag, or several to narrow it down (a post must have all of them). Board, robot and Linux posts are all in here.</p>
  </div>
  <div class="spec"><table>
    <tr><td>Posts with tags</td><td>{{ all.size }}</td></tr>
    <tr><td>Tags</td><td>{{ uniq.size }}</td></tr>
    <tr><td>Showing</td><td id="tg-count">{{ all.size }}</td></tr>
  </table></div>
</section>

<div class="tg-bar" id="tg-bar">
  <button class="tg-btn tg-clear" data-tag="">All</button>
  {% for t in uniq %}{% assign n = 0 %}{% for p in all %}{% if p.tags contains t %}{% assign n = n | plus: 1 %}{% endif %}{% endfor %}<button class="tg-btn" data-tag="{{ t }}">{{ t }} <span>{{ n }}</span></button>{% endfor %}
</div>

<div class="boardgrid" id="tg-grid">
{% for p in all %}
  <a class="bcard" href="{{ p.url | relative_url }}" data-tags="{{ p.tags | join: ' ' }}">
    <div class="ph" style="background-image:url('{{ p.picture | default: 'assets/images/apple-touch-icon.png' | prepend: '/' | relative_url }}')"></div>
    <span class="chip">{% if p.board_parent %}{{ p.board_parent | replace: "-", " " | upcase }}{% else %}{{ p.collection | replace: "_", " " | upcase }}{% endif %}</span>
    <h3>{{ p.title | remove: "[🔥] - " }}</h3>
    <p>{{ p.short_description }}</p>
    <div class="res">{% for t in p.tags %}<i>#{{ t }}</i> {% endfor %}</div>
  </a>
{% endfor %}
</div>
<div class="last"></div>

<script>
// Tag filter: selected tags live in location.hash ("#a+b"); a card shows when it has every selected tag.
(function () {
  var bar = document.getElementById('tg-bar'), cards = [].slice.call(document.querySelectorAll('#tg-grid .bcard'));
  function sel() { return decodeURIComponent(location.hash.slice(1)).split('+').filter(Boolean); }
  function apply() {
    var s = sel(), shown = 0;
    cards.forEach(function (c) {
      var t = c.getAttribute('data-tags').split(' ');
      var ok = s.every(function (x) { return t.indexOf(x) >= 0; });
      c.style.display = ok ? '' : 'none'; if (ok) shown++;
    });
    [].forEach.call(bar.querySelectorAll('.tg-btn'), function (b) {
      var t = b.getAttribute('data-tag');
      b.classList.toggle('on', t ? s.indexOf(t) >= 0 : s.length === 0);
    });
    document.getElementById('tg-count').textContent = shown;
  }
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('.tg-btn'); if (!b) return;
    var t = b.getAttribute('data-tag'), s = sel();
    if (!t) s = []; else if (s.indexOf(t) >= 0) s.splice(s.indexOf(t), 1); else s.push(t);
    history.replaceState(null, '', s.length ? '#' + s.join('+') : location.pathname);
    apply();
  });
  window.addEventListener('hashchange', apply);
  apply();
})();
</script>
