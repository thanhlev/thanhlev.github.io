---
layout: default
title: About
short_description: "Embedded/firmware engineer by day, dev boards at home most evenings"
permalink: /about/
---
<!-- about.md - rewritten 2026-11-22 (user «có cần phải cập nhật lại trang about không?» → «có»):
     the board hubs became the main part of the site, the Yocto block and the router/PPPoE stubs are
     hidden, the meta-radxa PR link is dead; prose instead of bullet lists (site CLAUDE.md, writing style).
     Every claim links to, or comes from, a post on this site. -->

# About Me

Hi, I'm **Thanh Le** (Lê Quang Thành). I work at Amazon as an embedded/firmware engineer. Outside work I play with dev boards I bought myself, and most evenings that means trying to get one of them to boot my way: from the boot ROM up, with my own code, and usually without Linux.

This site is where I write down what I found, so the next time I hit the same wall I don't start from zero. Every number on it was measured on the board.

## Where it started

My undergraduate thesis was a small humanoid robot on SG90 servos. I drew it in SolidWorks, worked out the DH table and the inverse kinematics, and planned its walking in simulation before running it on the controller ([videos here](/embedded/humanoid-robot)). One wrong angle in a matrix and the leg goes somewhere you didn't expect, and I've liked working at that level ever since.

## What's on the bench

Most of the site now lives in the [board pages](/#boards): one page per board, and inside it one story per milestone, written as Situation, Task, Action, Result.

The two I spent the most time on are the [Radxa ROCK 3A](/embedded/boards/rock3a/) and the [NanoPi 2 Fire](/embedded/boards/nanopi2-fire/). On the ROCK 3A I went from bare metal over Maskrom to FreeRTOS on all four A55 cores, then got the RTOS running on core 3 just 154 ms after power-on while Linux boots on the other three, ran a webcam through the NPU to HDMI with no Linux on the chip at all, and ported Android 14 to it. The NanoPi is a 2016 quad Cortex-A9 with no NPU, and it ended up doing face detection on FreeRTOS, with a webcam on HDMI for 1.5 % of the CPU.

Then there are the old boards I like pushing past what their vendors shipped: Android 15 on a [DragonBoard 8074](/embedded/boards/db8074/) that came with Android 4.3, a face detector on the 12 QPUs of a [2012 Raspberry Pi](/embedded/boards/pi1/), a 1080p webcam on HDMI from one RISC-V core of the [D1 Nezha](/embedded/boards/d1-nezha/). A few more ([Pi Zero W](/embedded/boards/pi-zero/), [Pi 5](/embedded/boards/pi5/), [Banana Pi M3](/embedded/boards/bpi-m3/), [Intel Edison](/embedded/boards/intel-edison/)) have smaller stories, and three ([Banana Pi R2](/embedded/boards/bpi-r2/), [NanoPC-T3](/embedded/boards/nanopc-t3/), [NanoPi K2](/embedded/boards/nanopi-k2/)) are only read so far, and their pages say so.

Older posts are still here too: my [Yocto port of the ROCK 3A](/embedded/rock3a-porting-yocto), the [ESP8266 boot sequence](/embedded/esp8266-boot-up) and [flash map](/embedded/esp8266-flash-map), a Pi that pretends to be a [Bluetooth keyboard and mouse](/embedded/keyboard-mouse-emulate-rpi) ([code on GitHub](https://github.com/thanhlev/keyboard_mouse_emulate_on_raspberry)), and a set of [Linux networking](/#linux-networking) notes on where a packet actually goes inside the kernel.

## What's next

Not on the site yet: a two-legged dinosaur robot on a frame I drew myself, with 13 DYNAMIXEL servos, LCD eyes and a passive TPU tail, which so far stands, walks and roars only in MuJoCo (maybe a kit later); a Microduck, the small duck robot from Pollen Robotics and Hugging Face that learns to walk by reinforcement learning, so far only in simulation; and the 3D-printed parts for both, drawn as CadQuery code with a script that checks every size and hole before I export the STL. On the boards side, the Pi 5 work still has to leave QEMU and run on the real board.

## Get in touch

If you're stuck on the same board, or you spot something wrong in a post, write to me. I'd rather hear it.

<div class="contact-info">
  <table class="contact-table">
    <tbody>
      <tr>
        <td><strong>Email</strong></td>
        <td>
          <a href="mailto:thanhlev@amazon.com.vn">thanhlev@amazon.com.vn</a><br>
          <a href="mailto:thanhlevvn@gmail.com">thanhlevvn@gmail.com</a>
        </td>
      </tr>
      <tr>
        <td><strong>LinkedIn</strong></td>
        <td><a target="_blank" href="https://www.linkedin.com/in/thanhlev">linkedin.com/in/thanhlev</a></td>
      </tr>
      <tr>
        <td><strong>GitHub</strong></td>
        <td><a target="_blank" href="https://github.com/thanhlev">github.com/thanhlev</a></td>
      </tr>
      <tr>
        <td><strong>Phone</strong></td>
        <td>+84 933 455 448</td>
      </tr>
    </tbody>
  </table>
</div>

## Stuff that shows up in the posts

<div class="tech-stack">
  <span class="tech-badge">Bare metal</span>
  <span class="tech-badge">FreeRTOS</span>
  <span class="tech-badge">Linux</span>
  <span class="tech-badge">Android</span>
  <span class="tech-badge">ARM / AArch64</span>
  <span class="tech-badge">RISC-V</span>
  <span class="tech-badge">NPU</span>
  <span class="tech-badge">USB / UVC</span>
  <span class="tech-badge">Raspberry Pi</span>
  <span class="tech-badge">Rockchip</span>
  <span class="tech-badge">Allwinner</span>
  <span class="tech-badge">netfilter</span>
</div>
