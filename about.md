---
layout: default
title: About
short_description: "Embedded/firmware engineer by day, dev boards at home most evenings"
picture: "assets/images/boards/nanopi2-fire/np2f_bench.jpg"
permalink: /about/
wide: true
---
{% comment %}
about.md - About page, Datasheet design (2026-11-22, user «thiết kế lại trang about nhìn cho thật đẹp»).
Full width (`wide: true`, see _layouts/default.html). Blocks, all styled in assets/css/style.scss (.ab-*):
hero (name + one-line role + spec table counted from the collections) -> §1 where it started (text +
thesis photo) -> §2 on the bench (text + 4 board cards with the one number each board is known for;
numbers copied from the result: lines of those posts) -> §3 what's next (3 cards, dino = my CadQuery/
Blender render) -> §4 contact cards -> tools strip. Text from the 2026-11-22 prose rewrite; phone kept
(user «có số điện thoại»).
2026-11-25 (user «có cần update lại trang about của tôi ko» → «ok»): hero names the robots, Edge AI and
the control library and counts them; ROCK 3A card gets the MCU / Debian / music stories; new §3 "Beyond the
boards" (4 cards, numbers from the hubs' stories' result: lines); dino card with its MuJoCo numbers;
more tools. · wiki: http://localhost:3000/wiki/claude/blog_agent#l11
2026-11-27: "Board stories" counts only stories under /boards/ (as index.md does; control/MCU stories were
counted too: 63 vs 43); row "Boards on the bench" -> "Board pages" (3 hubs were never on the bench).
Same day: the 8 .ab-card .ph backgrounds use the small thumbnails in assets/images/card/ (same relative path).
{% endcomment %}
{% assign live_emb = site.embedded | where_exp: "i", "i.publish != false" %}
{% assign hubs = live_emb | where: "board_hub", true %}
{% assign stories = live_emb | where_exp: "i", "i.board_parent != nil" | where_exp: "i", "i.path contains '/boards/'" %}
{% assign robots = site.robotics | where: "board_hub", true %}
{% assign ai_a = site.embedded | where: "edge_ai", true %}{% assign ai_b = site.robotics | where: "edge_ai", true %}{% assign ai_all = ai_a | concat: ai_b %}

<section class="ab-hero">
  <div class="ab-id">
    <div class="pn">ABOUT · ENGINEER PROFILE · REV {{ site.time | date: "%Y.%m" }}</div>
    <h1>Thanh Le<span>Lê Quang Thành</span></h1>
    <p class="ab-role">Embedded / firmware engineer at Amazon. At home, most evenings, a dev board and a UART cable.</p>
    <p>I like getting a board to boot my way: from the boot ROM up, with my own code, and usually without Linux. This site is where I write down what broke and what I measured, so the next time I hit the same wall I don't start from zero.</p>
    <p>Around the boards there are robots (mostly in simulation so far), AI models running on the board itself, and a C++ control library I check against simulated plants before it ever drives a motor.</p>
  </div>
  <div class="ab-spec">
    <table>
      <tr><td>Day job</td><td>Embedded / firmware engineer</td></tr>
      <tr><td>Employer</td><td>Amazon</td></tr>
      <tr><td>Board pages</td><td>{{ hubs.size }}</td></tr>
      <tr><td>Board stories (STAR)</td><td>{{ stories.size }}</td></tr>
      <tr><td>Robots</td><td>{{ robots.size }}</td></tr>
      <tr><td>AI on the board</td><td>{{ ai_all.size }} stories</td></tr>
      <tr><td>Writing here since</td><td>2017</td></tr>
    </table>
  </div>
</section>

<div class="sec"><h2>Where it started</h2><span>§1</span></div>
<section class="ab-two">
  <div class="ab-text">
    <p>My undergraduate thesis was a small humanoid robot on SG90 servos. I drew it in SolidWorks, worked out the DH table and the inverse kinematics, and planned its walking in simulation before running it on the controller.</p>
    <p>One wrong angle in a matrix and the leg goes somewhere you didn't expect. I've liked working at that level ever since: close to the hardware, where a number is either right or the thing falls over.</p>
    <p><a href="{{ '/robotics/humanoid/thesis' | relative_url }}">The thesis robot and its videos →</a></p>
  </div>
  <a class="ab-photo" href="{{ '/robotics/humanoid/thesis' | relative_url }}"><img src="{{ '/assets/images/about/thesis_robot.jpg' | relative_url }}" alt="Version 2 of my thesis humanoid, 3D-printed, next to a toy robot dog"><span>Thesis robot, version 2: 3D-printed again, same size and SG90 servos</span></a>
</section>

<div class="sec"><h2>What's on the bench</h2><span>§2 · one page per board, one story per milestone</span><a class="more btn" href="{{ '/#boards' | relative_url }}">All {{ hubs.size }} boards</a></div>
<section class="ab-lead"><p>The two I spent the most time on are the ROCK 3A and the NanoPi 2 Fire. Then there are the old boards I like pushing past what their vendors shipped. Each card is the one number that board is known for on this site.</p></section>
<div class="ab-feat">
  <a class="ab-card" href="{{ '/embedded/boards/rock3a/' | relative_url }}">
    <div class="ph" style="background-image:url('{{ '/assets/images/card/boards/rock3a/rock-3a.jpg' | relative_url }}')"></div>
    <span class="chip">RK3568</span><b class="num">154 ms</b>
    <h3>Radxa ROCK 3A</h3><p>FreeRTOS on core 3 at 154 ms after power-on, my own Debian 13 on the other three; the NPU with no Linux; a RISC-V MCU that watches the webcam with all four A55s off; LEDs that follow the music; Android 14.</p>
  </a>
  <a class="ab-card" href="{{ '/embedded/boards/nanopi2-fire/' | relative_url }}">
    <div class="ph" style="background-image:url('{{ '/assets/images/card/boards/nanopi2-fire/np2f_bench.jpg' | relative_url }}')"></div>
    <span class="chip">S5P4418</span><b class="num">1.5 % CPU</b>
    <h3>NanoPi 2 Fire</h3><p>A 2016 quad Cortex-A9 with no NPU: webcam to HDMI on FreeRTOS, then face detection.</p>
  </a>
  <a class="ab-card" href="{{ '/embedded/boards/db8074/' | relative_url }}">
    <div class="ph" style="background-image:url('{{ '/assets/images/card/boards/db8074/d8k_board.jpg' | relative_url }}')"></div>
    <span class="chip">Snapdragon 800</span><b class="num">Android 15</b>
    <h3>DragonBoard 8074</h3><p>A 2013 dev kit that shipped with Android 4.3, now on kernel 6.6 with HDMI and local AI.</p>
  </a>
  <a class="ab-card" href="{{ '/embedded/boards/pi1/' | relative_url }}">
    <div class="ph" style="background-image:url('{{ '/assets/images/card/boards/pi1/pi1_bench.jpg' | relative_url }}')"></div>
    <span class="chip">BCM2835</span><b class="num">43.5 ms</b>
    <h3>Raspberry Pi 1 (2012)</h3><p>No Linux: a face detector on the 12 QPUs, 2.37 s down to 43.5 ms per picture.</p>
  </a>
</div>
<section class="ab-lead"><p>Older posts are still here too: my <a href="{{ '/embedded/rock3a-porting-yocto' | relative_url }}">Yocto port of the ROCK 3A</a>, the ESP8266 <a href="{{ '/embedded/esp8266-boot-up' | relative_url }}">boot sequence</a> and <a href="{{ '/embedded/esp8266-flash-map' | relative_url }}">flash map</a>, a Pi that pretends to be a <a href="{{ '/embedded/keyboard-mouse-emulate-rpi' | relative_url }}">Bluetooth keyboard and mouse</a>, and <a href="{{ '/#linux-networking' | relative_url }}">Linux networking notes</a> on where a packet actually goes inside the kernel.</p></section>

<div class="sec"><h2>Beyond the boards</h2><span>§3 · robots, AI on the board, control, MCUs</span></div>
<div class="ab-feat">
  <a class="ab-card" href="{{ '/#robotics' | relative_url }}">
    <div class="ph" style="background-image:url('{{ '/assets/images/card/robotics/dino-robot/dino_walk_cover.jpg' | relative_url }}')"></div>
    <span class="chip">Robotics</span><b class="num">{{ robots.size }} robots</b>
    <h3>Robots, in MuJoCo first</h3><p>A dinosaur on my own frame, my thesis humanoid, a Microduck, DYNAMIXEL servos and a Hokuyo lidar. The dino walks 30 of 30 runs on perturbed robots, in simulation.</p>
  </a>
  <a class="ab-card" href="{{ '/edge-ai/' | relative_url }}">
    <div class="ph" style="background-image:url('{{ '/assets/images/card/boards/rock3a/rtos_face_cover.jpg' | relative_url }}')"></div>
    <span class="chip">Edge AI</span><b class="num">{{ ai_all.size }} stories</b>
    <h3>AI on the board itself</h3><p>Face detection on an NPU with no Linux, on a 2016 Cortex-A9 and on a 2012 Pi's QPUs; an offline Vietnamese voice assistant; an LLM on a 2013 phone chip.</p>
  </a>
  <a class="ab-card" href="{{ '/embedded/control/control-library/' | relative_url }}">
    <div class="ph" style="background-image:url('{{ '/assets/images/card/control/control-library/control_library_cover.jpg' | relative_url }}')"></div>
    <span class="chip">C++17</span><b class="num">0.77 s</b>
    <h3>A control library, in simulation</h3><p>PID, LQR, MPC, ADRC, sliding mode and estimators, each checked against a plant. Back from windup in 0.77 s instead of 108.</p>
  </a>
  <a class="ab-card" href="{{ '/embedded/mcu/esp32-s3/' | relative_url }}">
    <div class="ph" style="background-image:url('{{ '/assets/images/card/mcu/esp32-s3/esp32_s3_cover.jpg' | relative_url }}')"></div>
    <span class="chip">ESP32-S3</span><b class="num">30.3 fps</b>
    <h3>MCU demo apps</h3><p>USB device demos and a USB webcam on the ESP32-S3: 640×480 scaled to 320×240 at 30.3 frames a second.</p>
  </a>
</div>

<div class="sec"><h2>What's next</h2><span>§4 · started, not finished</span></div>
<div class="ab-next">
  <div class="ab-ncard ab-ncard-img">
    <img src="{{ '/assets/images/about/dino_render.jpg' | relative_url }}" alt="Render of one of my dinosaur robot variants">
    <div><span class="chip">Robot</span><h3>A two-legged dinosaur</h3><p>On a frame I drew myself: 13 DYNAMIXEL servos, LCD eyes, a passive TPU tail. So far it stands, walks (40.7 mm/s) and roars only in MuJoCo. Maybe a kit later. <em>(Render of one variant.)</em></p></div>
  </div>
  <div class="ab-ncard"><span class="chip">Robot</span><h3>A Microduck</h3><p>The small duck robot from Pollen Robotics and Hugging Face that learns to walk by reinforcement learning. Official policies run in simulation; no servos bought yet.</p></div>
  <div class="ab-ncard"><span class="chip">CAD</span><h3>Parts as code</h3><p>The 3D-printed parts for both robots, drawn in CadQuery, with a script that checks every size and hole before I export the STL.</p></div>
  <div class="ab-ncard"><span class="chip">Board</span><h3>Pi 5 off QEMU</h3><p>FreeRTOS borrowing core 3 of a running Linux passes all its checks in QEMU. Next it has to run on the real board.</p></div>
</div>

<div class="sec"><h2>Get in touch</h2><span>§5 · stuck on the same board, or spotted a mistake: I'd rather hear it.</span></div>
<div class="ab-contact">
  <a href="mailto:thanhlevvn@gmail.com"><span>Email</span><b>thanhlevvn@gmail.com</b></a>
  <a href="mailto:thanhlev@amazon.com.vn"><span>Work email</span><b>thanhlev@amazon.com.vn</b></a>
  <a href="tel:+84933455448"><span>Phone</span><b>+84 933 455 448</b></a>
  <a href="https://www.linkedin.com/in/thanhlev" target="_blank" rel="noopener"><span>LinkedIn</span><b>in/thanhlev</b></a>
  <a href="https://github.com/thanhlev" target="_blank" rel="noopener"><span>GitHub</span><b>github.com/thanhlev</b></a>
</div>

<div class="sec"><h2>Tools in the posts</h2><span>§6</span></div>
<div class="ab-tools">
  <span>Bare metal</span><span>FreeRTOS</span><span>Linux</span><span>Android</span><span>ARM / AArch64</span><span>RISC-V</span><span>NPU</span><span>USB / UVC</span><span>Raspberry Pi</span><span>Rockchip</span><span>Allwinner</span><span>netfilter</span><span>C / C++</span><span>Python</span><span>ESP32-S3</span><span>Edge AI</span><span>PID · LQR · MPC</span><span>CadQuery</span><span>MuJoCo</span>
</div>
<div class="last"></div>
