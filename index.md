---
layout: default
title: Home
---
{% comment %}
index.md - home page, "Datasheet" design (style A, 2026-11-22, user «tôi chọn style a»).
Blocks: hero (who I am + a spec table counted from the collections) -> Boards (one card per
board hub: front matter `board_hub: true`, its first STAR result) -> other embedded notes ->
Linux Networking / Linux General / Yocto as rows (_includes/note_rows.html).
Drafts: `publish: false` is skipped everywhere; a missing `publish` counts as published.
STAR sub-pages (`board_parent`) are listed on their hub only. Anchors #boards,
#embedded-systems, #linux-networking, #linux-general, #yocto-project are linked from the top bar
and from older posts: keep them.
{% endcomment %}
{% assign live_emb = site.embedded | where_exp: "i", "i.publish != false" %}
{% assign hubs = live_emb | where: "board_hub", true | sort: "index" %}
{% assign stories = live_emb | where_exp: "i", "i.board_parent != nil" %}
{% assign emb_notes = live_emb | where_exp: "i", "i.board_parent == nil" | where_exp: "i", "i.board_hub != true" | sort: "index" %}
{% assign net = site.linux_networking | where_exp: "i", "i.publish != false" | sort: "index" %}
{% assign gen = site.linux_general | where_exp: "i", "i.publish != false" | sort: "index" %}
{% assign yoc = site.yocto | where_exp: "i", "i.publish != false" | sort: "index" %}

<section class="hero">
  <div class="l">
    <div class="pn">DOC TL-{{ site.time | date: "%Y" }} · BENCH NOTES · EMBEDDED / LINUX</div>
    <h1>I take boards apart<br>from the <em>boot ROM</em> up.</h1>
    <p>I'm Thanh Le, an embedded/firmware engineer at Amazon. Most evenings I'm at home getting one of my own dev boards to boot: bare metal, FreeRTOS, an NPU without Linux, old SoCs pushed further than their vendors went.</p>
    <p>This site is where I write down what broke and what I measured, so the next time I hit the same wall I don't start from zero.</p>
    <div class="cta"><a class="btn" href="#boards">See the boards</a><a class="btn" href="{{ '/about/' | relative_url }}">About me</a></div>
  </div>
  <div class="spec">
    <table>
      <tr><td>Boards on the bench</td><td>{{ hubs.size }}</td></tr>
      <tr><td>Board stories (STAR)</td><td>{{ stories.size }}</td></tr>
      <tr><td>Linux &amp; Yocto notes</td><td>{{ net.size | plus: gen.size | plus: yoc.size }}</td></tr>
      <tr><td>Power-on to RTOS (ROCK 3A)</td><td>154 ms</td></tr>
      <tr><td>Oldest SoC revived</td><td>BCM2835 (2012)</td></tr>
      <tr><td>Writing here since</td><td>2017</td></tr>
    </table>
  </div>
</section>

<div class="sec" id="boards"><h2>Boards</h2><span>§1 · one hub per board, each milestone written as Situation / Task / Action / Result</span></div>
<div class="boardgrid">
{% for h in hubs %}
  {% assign kids = site.embedded | where: "board_parent", h.slug | where_exp: "i", "i.publish != false" | sort: "index" %}
  {% assign name = h.title | split: ":" | first %}
  {% assign soc = "" %}{% if name contains "(" %}{% assign soc = name | split: "(" | last | remove: ")" %}{% assign name = name | split: " (" | first %}{% endif %}
  <a class="bcard" href="{{ h.url | relative_url }}">
    <div class="ph" style="background-image:url('{{ h.picture | prepend: '/' | relative_url }}')"></div>
    {% if soc != "" %}<span class="chip">{{ soc }}</span>{% endif %}
    <h3>{{ name }}</h3>
    <p>{{ h.short_description }}</p>
    <div class="res">{% if kids.size > 0 %}<b>{{ kids.size }} {% if kids.size == 1 %}story{% else %}stories{% endif %}</b> · {{ kids.first.result | truncate: 110 }}{% else %}<b>hub only</b> · nothing measured on the board yet{% endif %}</div>
  </a>
{% endfor %}
</div>

<div class="sec" id="embedded-systems"><h2>Embedded notes</h2><span>§2 · single posts, older projects and reading notes</span></div>
{% include note_rows.html items=emb_notes %}

<div class="sec" id="linux-networking"><h2>Linux networking</h2><span>§3 · where a packet actually goes</span></div>
{% include note_rows.html items=net %}

<div class="sec" id="linux-general"><h2>Linux general</h2><span>§4 · tools and snippets I keep coming back to</span></div>
{% include note_rows.html items=gen %}

<div class="sec" id="yocto-project"><h2>Yocto</h2><span>§5</span></div>
{% include note_rows.html items=yoc %}
<div class="last"></div>
