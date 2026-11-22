---
layout: default
title: "Add Yocto support for Rock-3A Single Board Computer"
short_description: "My meta-radxa port for the Rock-3A (RK3568), from the Radxa BSP to Yocto"
picture: "assets/images/rock-3a.jpg"
latest_release: "2026-11-22: upstream PR link is dead (meta-radxa was reset)"
status: "Done"
index: 99   # 2026-11-22: last on the ROCK 3A hub (user «đưa nó xuống dưới cùng»)
publish: true
board_parent: rock3a
result: "Console and desktop images booting from my meta-radxa port, sent upstream as PR #29"
---

# Porting Rock-3A rockchip-bsp to Yocto Project
{: .no_toc }

![](../../../assets/images/rock3a/rock-3a.jpg)

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------

## Description

I wanted to try the RK3568 on a board I could afford, and the [Rock-3A](https://wiki.radxa.com/Rock3/3a)
from [Radxa](https://wiki.radxa.com/Home) was it. I also wanted my own Yocto image on it, not the
vendor Debian, but [meta-radxa](https://wiki.radxa.com/Yocto-layer-for-radxa-boards) didn't support
the Rock-3A machine yet.

So I ported it myself, starting from [Radxa's BSP](https://wiki.radxa.com/Rock3/dev/Debian), and sent
it upstream as a pull request. Enjoy it!

## My pull request for Yocto Rock-3A-RK3568 porting

[https://github.com/radxa/meta-radxa/pull/29](https://github.com/radxa/meta-radxa/pull/29)

> **Update (2026-11-22)**
> Radxa restarted the meta-radxa repo from scratch in September 2026 (the history now begins on
> 2026-09-02), so this link gives a 404 today and I haven't found an archived copy. The photos below
> are what's left of the test run.

## Porting's test result

### Desktop image (radxa-desktop-image)

![](../../../assets/images/rock3a/desktop_result.jpg)


### Console Image (radxa-console-image)

![](../../../assets/images/rock3a/console_result.jpg)

> **Note**
> The result photos above were captured before the merging. According to reviewer comments, the hostname is now changed to `rock-3a-rk3568`
