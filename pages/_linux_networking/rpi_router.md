---
layout: default
title: "Raspberry Pi 4 mini router: Ethernet WAN, Wi-Fi access point"
short_description: "Internet comes in on the Pi's Ethernet port, the Pi shares it as its own Wi-Fi network"
status: "Pending"
picture: "assets/images/raspberry_pi4.png"
latest_release: "2026-11-22: plan written, nothing run yet"
index: 7
publish: false
---

# Raspberry Pi 4 mini router: Ethernet in, Wi-Fi out

{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------
## Introduction

The setup: a cable from the upstream router goes into the Pi 4's Ethernet port (`eth0`, the WAN side), and the Pi's own Wi-Fi (`wlan0`) becomes an access point with its own subnet (the LAN side). The mirror image of this, Wi-Fi as the uplink and Ethernet as the LAN, is in [the WWAN post]({{ site.baseurl }}{% link _linux_networking/rpi_router_wwan.md %}).

## Plan (nothing run yet)

None of this has been run on the board yet; commands and output go here once they have.

1. `wlan0` as an access point with `hostapd` (nl80211 driver), see [Linux Wi-Fi Driver]({{ site.baseurl }}{% link _linux_networking/linux_wifi_driver.md %}).
2. A static address on `wlan0` and a DHCP/DNS server for the Wi-Fi clients (`dnsmasq`).
3. `net.ipv4.ip_forward=1` and MASQUERADE out of `eth0`, as in [Linux Packet Filtering]({{ site.baseurl }}{% link _linux_networking/linux_table_chain.md %}).
4. Make it survive a reboot, then measure throughput Wi-Fi client to WAN.
