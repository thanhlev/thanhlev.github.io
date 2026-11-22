---
layout: default
title: "Setup PPPoE server on Raspberry Pi board"
short_description: "A PPPoE server on a Pi, to learn what an ISP's PPPoE login actually does"
status: "Pending"
picture: "assets/images/pppoe_server.png"
latest_release: "2026-11-22: plan written, nothing run yet"
index: 9
publish: false
---

# Setup PPPoE Server on Raspberry Pi Board

{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------
## Introduction

I want to run a PPPoE server on a Raspberry Pi to learn how PPPoE works: the thing an ISP's router does when it "logs in" with a username and password before it gets an address. With the server on my own bench I can watch both sides.

## Plan (nothing run yet)

None of this has been run yet; commands and captures go here once they have.

1. Server: `pppoe-server` from rp-pppoe, with `pppd` options and a `chap-secrets` file for one test user.
2. Client: a second machine (or an OpenWrt router with `proto pppoe`, see [Linux Network Management]({{ site.baseurl }}{% link _linux_networking/network_management.md %})).
3. Capture the discovery stage (PADI, PADO, PADR, PADS) and the PPP session (LCP, CHAP, IPCP) with `tcpdump`.
4. Check the MTU (1492) and the MSS clamping rule from [Linux Packet Filtering]({{ site.baseurl }}{% link _linux_networking/linux_table_chain.md %}).
