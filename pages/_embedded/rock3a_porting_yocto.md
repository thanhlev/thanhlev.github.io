---
layout: default
title: "Add Yocto support for Rock-3A Single Board Computer"
short_description: "My Rock-3A machine for meta-radxa, from the Radxa BSP to two booting Yocto images and a pull request"
picture: "assets/images/rock-3a.jpg"
latest_release: "2026-11-22: rewritten as a STAR story; upstream PR link is dead (meta-radxa was reset)"
status: "Done"
index: 99   # 2026-11-22: last on the ROCK 3A hub (user «đưa nó xuống dưới cùng»)
publish: true
board_parent: rock3a
result: "Console and desktop images booting from my meta-radxa port, sent upstream as PR #29"
tags: [rockchip, arm, boot, yocto]
---

<!-- 2026-11-22: rewritten in STAR form like the other ROCK 3A stories (user «trang này không theo STAR
     format»). Same facts as before, nothing added: Radxa BSP -> meta-radxa machine, PR #29, two images. -->

[Back to the ROCK 3A hub](/embedded/boards/rock3a/)

![The Radxa ROCK 3A on my desk](../../../assets/images/rock3a/rock-3a.jpg)

## Situation

I wanted to try the RK3568 on a board I could afford, and the [Rock-3A](https://wiki.radxa.com/Rock3/3a) from [Radxa](https://wiki.radxa.com/Home) was it. I also wanted my own Yocto image on it rather than the vendor Debian, but [meta-radxa](https://wiki.radxa.com/Yocto-layer-for-radxa-boards), Radxa's Yocto layer, had no Rock-3A machine yet.

## Task

Add the Rock-3A to meta-radxa: a machine that builds from Radxa's own BSP and boots both of the layer's images, the console one and the desktop one, and get it accepted upstream so nobody else has to repeat it.

## Action

I started from [Radxa's BSP](https://wiki.radxa.com/Rock3/dev/Debian), the same kernel and U-Boot their Debian image uses, and ported it into the layer as a new Rock-3A machine. Then I built `radxa-console-image` and `radxa-desktop-image`, booted each one on the board, and sent the port to Radxa as [pull request #29](https://github.com/radxa/meta-radxa/pull/29). The reviewers asked for a few changes, one of them the hostname, which became `rock-3a-rk3568`.

## Result

Both images boot on the board from my port. The photos were taken before the review, so they still show the old hostname.

![radxa-desktop-image running on the Rock-3A](../../../assets/images/rock3a/desktop_result.jpg)
*radxa-desktop-image on the Rock-3A.*

![radxa-console-image running on the Rock-3A](../../../assets/images/rock3a/console_result.jpg)
*radxa-console-image on the serial console.*

> **Update (2026-11-22)**
> Radxa restarted the meta-radxa repo from scratch in September 2026 (its history now begins on 2026-09-02), so the PR link gives a 404 today and I haven't found an archived copy. These two photos are what's left of the test run.

## What I'd do next

Nothing more on Yocto for now: since then the ROCK 3A became my bare-metal, FreeRTOS and Android board, and those stories are on the [hub page](/embedded/boards/rock3a/).
