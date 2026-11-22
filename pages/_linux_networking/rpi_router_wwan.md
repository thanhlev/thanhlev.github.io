---
layout: default
title: "Raspberry Pi 4 mini router: Wi-Fi WAN (WWAN), Ethernet LAN"
short_description: "The Pi joins an existing Wi-Fi as a client and shares that connection on its Ethernet port"
status: "Pending"
picture: "assets/images/raspberry_pi4.png"
latest_release: "2026-11-22: plan written, nothing run yet"
index: 8
publish: false
---

# Raspberry Pi 4 mini router: Wi-Fi in, Ethernet out

{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------
## Introduction

The reverse of [the Ethernet-to-Wi-Fi router]({{ site.baseurl }}{% link _linux_networking/rpi_router.md %}): the Pi 4 connects to an existing Wi-Fi network as a normal client (`wlan0` is the WAN, the "WWAN"), and whatever is plugged into its Ethernet port (`eth0`, the LAN) gets internet through it. Handy for a device that only has Ethernet, in a place that only has Wi-Fi.

## Plan (nothing run yet)

None of this has been run on the board yet; commands and output go here once they have.

1. `wlan0` in station mode with `wpa_supplicant`.
2. A static address on `eth0` and DHCP for the wired side (`dnsmasq`).
3. IP forwarding and MASQUERADE out of `wlan0`. Bridging `eth0` with `wlan0` instead doesn't work in station mode (the AP drops frames from MACs that never associated, same reason as macvlan on Wi-Fi), so it has to be routed.
4. What happens to the LAN side when the Wi-Fi drops and comes back.
