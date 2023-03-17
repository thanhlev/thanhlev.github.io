---
layout: default
title: "[🔥] - Add Yocto support for Rock-3A Single Board Computer"
short_description: Porting from bsp to Yocto
picture: "assets/images/rock-3a.jpg"
latest_release: "Unknown"
status: "Done"
index: 3
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

I have a task to evaluate the board [Rock-3A](https://wiki.radxa.com/Rock3/3a) from [Radxa](https://wiki.radxa.com/Home) for my upcoming projects.
The projects require the Yocto build system, but the current [meta-radxa](https://wiki.radxa.com/Yocto-layer-for-radxa-boards) does node support Rock-3A machine.

So I create a pull request to port the Rock-3A based on [Radxa's bsp](https://wiki.radxa.com/Rock3/dev/Debian). Enjoy it!

## My pull request for Yocto Rock-3A-RK3568 porting

[https://github.com/radxa/meta-radxa/pull/29](https://github.com/radxa/meta-radxa/pull/29)

## Porting's test result

### Desktop image (radxa-desktop-image)

![](../../../assets/images/rock3a/desktop_result.jpg)


### Consolse Image (radxa-console-image)

![](../../../assets/images/rock3a/console_result.jpg)

> **Note**
> The result photos above were captured before the merging. According to reviewer comments, the hostname is now changed to `rock-3a-rk3568`
