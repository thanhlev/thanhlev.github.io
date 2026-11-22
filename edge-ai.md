---
layout: default
title: "Edge AI"
short_description: "Models running on the boards themselves: NPUs, GPUs, old CPUs, no cloud"
picture: "assets/images/boards/rock3a/rtos_face_cores.png"
permalink: /edge-ai/
wide: true
---
{% comment %}
edge-ai.md - Edge AI page (2026-11-22, user «Thêm 1 page là "Edge AI" cùng cấp với Board, ở đây gom các
project có liên quan đến AI lại, có thể trùng với các category khác cũng được»). Lists every story with
`edge_ai: true` from both collections (board and robot stories stay where they are; this is a view).
{% endcomment %}
{% assign a = site.embedded | where: "edge_ai", true %}
{% assign b = site.robotics | where: "edge_ai", true %}
{% assign ai = a | concat: b | where_exp: "i", "i.publish != false" | sort: "edge_ai_index" %}

<section class="hero">
  <div class="l">
    <div class="pn">EDGE AI · MODELS ON THE BOARD · NO CLOUD</div>
    <h1>AI on the <em>board</em>,<br>not in the cloud.</h1>
    <p>Face detection on an NPU with no Linux, on a 2016 Cortex-A9, on the 12 QPUs of a 2012 Raspberry Pi; a voice assistant and a small LLM with the network unplugged; a duck robot that learns to walk. Each card is one story from a board or robot page, with the number I measured.</p>
  </div>
  <div class="spec">
    <table>
      <tr><td>AI stories</td><td>{{ ai.size }}</td></tr>
      <tr><td>Fastest face detect (ROCK 3A NPU)</td><td>25 fps</td></tr>
      <tr><td>Oldest chip running a model</td><td>BCM2835 (2012)</td></tr>
      <tr><td>Accelerators used</td><td>NPU · QPU · CPU</td></tr>
    </table>
  </div>
</section>

<div class="sec"><h2>Stories</h2><span>§1 · they also live on their board or robot page</span></div>
{% include story_grid.html items=ai %}
<div class="last"></div>
