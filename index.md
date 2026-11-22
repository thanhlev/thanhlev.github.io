---
layout: default
title: Home
---
{% comment %}
index.md - home page, "Datasheet" design (style A, 2026-11-22, user «tôi chọn style a»).
Blocks: hero (who I am + a spec table counted from the collections) -> Boards (one card per
board hub: front matter `board_hub: true`, its first STAR result) -> other embedded notes ->
Linux Networking / Linux General as cards too (_includes/card_grid.html, 2026-11-22 user «Linux networking và Linux general»).
The Yocto block was removed the same day (user «Xóa Yocto vì chưa có bài»); add it back when site.yocto has a real post.
Drafts: `publish: false` is skipped everywhere; a missing `publish` counts as published.
STAR sub-pages (`board_parent`) are listed on their hub only. Anchors #boards,
#embedded-systems, #linux-networking, #linux-general are linked from the top bar
and from older posts: keep them.
{% endcomment %}
{% assign live_emb = site.embedded | where_exp: "i", "i.publish != false" %}
{% assign hubs = live_emb | where: "board_hub", true | sort: "index" %}
{% assign stories = live_emb | where_exp: "i", "i.board_parent != nil" %}
{% assign emb_notes = live_emb | where_exp: "i", "i.board_parent == nil" | where_exp: "i", "i.board_hub != true" | sort: "index" %}
{% assign net = site.linux_networking | where_exp: "i", "i.publish != false" | sort: "index" %}
{% assign gen = site.linux_general | where_exp: "i", "i.publish != false" | sort: "index" %}

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
      <tr><td>Linux notes</td><td>{{ net.size | plus: gen.size }}</td></tr>
      <tr><td>Power-on to RTOS (ROCK 3A)</td><td>154 ms</td></tr>
      <tr><td>Oldest SoC revived</td><td>BCM2835 (2012)</td></tr>
      <tr><td>Writing here since</td><td>2017</td></tr>
    </table>
  </div>
</section>

<div class="sec" id="boards"><h2>Boards</h2><span>§1 · one hub per board, each milestone written as Situation / Task / Action / Result</span></div>
{% include hub_grid.html coll="embedded" %}

{% assign robo_hubs = site.robotics | where_exp: "i", "i.publish != false" | where: "board_hub", true %}
{% if robo_hubs.size > 0 %}
<div class="sec" id="robotics"><h2>Robotics</h2><span>§1b · one hub per robot, each milestone as Situation / Task / Action / Result</span></div>
{% include hub_grid.html coll="robotics" %}
{% endif %}

<div class="sec" id="embedded-systems"><h2>Embedded notes</h2><span>§2 · single posts, older projects and reading notes</span></div>
{% include card_grid.html items=emb_notes %}

<div class="sec" id="linux-networking"><h2>Linux networking</h2><span>§3 · where a packet actually goes</span></div>
{% include card_grid.html items=net %}

<div class="sec" id="linux-general"><h2>Linux general</h2><span>§4 · tools and snippets I keep coming back to</span></div>
{% include card_grid.html items=gen %}

<div class="last"></div>
