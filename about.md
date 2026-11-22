---
layout: default
title: About
permalink: /about/
---

# About Me

Hi, I'm **Thanh Le** (Lê Quang Thành). I work at Amazon as an embedded/firmware engineer.

Outside work I play with dev boards, and most evenings that means trying to get one of them to boot.
This site is where I write down what I found, so the next time I hit the same wall I don't start from zero.

## Where it started

My undergraduate thesis was a humanoid robot: a servo-driven biped that walks, keeps its balance with an IMU and plays back motion routines.
The [videos are here](/embedded/humanoid-robot) if you want to see it walk.
That project is the reason I still like the low-level end of things, where getting the balance wrong means the robot falls over.

## What I tinker with

- **Boards and bring-up.** The Radxa ROCK 3A had no machine in meta-radxa, so I ported it from Radxa's BSP and sent [a pull request](https://github.com/radxa/meta-radxa/pull/29) ([my notes](/embedded/rock3a-porting-yocto)). Older notes on the [Tiny210](/embedded/tiny210-information) (Samsung S5PV210) and the TI [TM4C123](/embedded/tm4c123gh6zrb-architecture-overview) live here too.
- **Small chips.** How the ESP8266 lays out its [flash](/embedded/esp8266-flash-map) and what it does from reset to app in the [boot sequence](/embedded/esp8266-boot-up).
- **Raspberry Pi hacks.** A Pi that pretends to be a [Bluetooth keyboard, mouse and media remote](/embedded/keyboard-mouse-emulate-rpi) ([code on GitHub](https://github.com/thanhlev/keyboard_mouse_emulate_on_raspberry)).
- **Linux networking.** Where a packet actually goes inside the kernel: [netfilter tables and chains](/linux_networking/linux-table-chain), [MACVLAN](/linux_networking/linux-macvlan), [virtual interfaces](/linux_networking/virtual-interface), [Docker networking](/linux_networking/docker-network) and the [Wi-Fi driver stack](/linux_networking/linux-wifi-driver).
- **Yocto and testing glue.** [Yocto tips](/embedded/yocto-tips), [pytest](/embedded/pytest) and [pytest-embedded](/embedded/pytest-embedded) (those two are in Vietnamese).

Some pages are polished, some are half a page of commands. The status tag on each card tells you which.

## What's next

These have a page already, but it's only a stub so far:

- a Raspberry Pi 4 as a small router, both Ethernet-to-Wi-Fi and Wi-Fi-to-Ethernet;
- a PPPoE server on a Pi, mostly to learn how PPPoE works;
- OpenWrt built for the Banana Pi R2.

And the new stuff, which has no post at all yet:

- a two-legged dinosaur robot on a frame I drew myself: 13 DYNAMIXEL servos (6 MX-28, 7 AX-12A), one SG90 for both arms, LCD eyes and a passive TPU tail. So far it stands, walks, turns and roars only in MuJoCo. Maybe as a kit later;
- a Microduck, the ~25 cm duck from Pollen Robotics and Hugging Face that learns to walk by reinforcement learning. I've run the official policies in simulation; no servos bought yet;
- the 3D-printable parts for all of this, drawn as CadQuery code, with a script that checks every size and hole before I export the STL.

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
  <span class="tech-badge">Linux</span>
  <span class="tech-badge">Yocto</span>
  <span class="tech-badge">Python</span>
  <span class="tech-badge">Docker</span>
  <span class="tech-badge">Raspberry Pi</span>
  <span class="tech-badge">ESP8266</span>
  <span class="tech-badge">Bluetooth HID</span>
  <span class="tech-badge">netfilter</span>
  <span class="tech-badge">OpenWrt</span>
</div>
