---
layout: default
title: "Search"
short_description: "Find a story by any word: board, chip, tool, error message"
permalink: /search/
wide: true
---
{% comment %}
search.md - client-side search page (no server, no library): the box below + assets/js/search.js, which reads
/search.json. ?q=word in the URL fills the box (the 404 page sends its form here). "/" focuses the box.
2026-11-27 · new (site review). wiki: http://localhost:3000/wiki/claude/blog_agent#l11
{% endcomment %}
<section class="srch">
  <div class="pn">SEARCH · ALL POSTS</div>
  <h1 class="doctitle">Search</h1>
  <form class="srch-f" role="search" action="{{ '/search/' | relative_url }}" method="get" onsubmit="return false">
    <label for="q" class="sr-only">Search the site</label>
    <input id="q" name="q" type="search" autocomplete="off" spellcheck="false" placeholder="npu, freertos, u-boot ...  (press / to focus)">
  </form>
  <p id="srch-n" class="srch-n" aria-live="polite"></p>
  <div id="srch-r" class="srch-r"></div>
</section>
<script src="{{ '/assets/js/search.js' | relative_url }}" data-index="{{ '/search.json' | relative_url }}" defer></script>
