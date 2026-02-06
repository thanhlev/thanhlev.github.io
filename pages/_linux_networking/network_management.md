---
layout: default
title: "Linux Network Management"
short_description: "Types of network management on Linux"
picture: "assets/images/linux_network_management.png"
status: "Done"
index: 1
latest_release: "add Ifupdown"
publish: true
---

# Linux Network Management
{: .no_toc }
## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------
## Ifupdown
- After the driver successfully registers the net interface with the kernel, the ifupdown tool performs bring up and configures the interface.
- ifupdown reads configuration information from the `/etc/network/interfaces` file.
- Current Ubuntu distributions no longer use this model.
- Examples

```python
# static IP
iface eth0 inet static
    address 192.168.0.111
    netmask 255.255.255.0
    gateway 192.168.0.1

```
```python
# DHCP IP
iface eth0 inet dhcp

```

```python
# Wi-Fi interface
iface wlan0 inet dhcp
    wireless-essid myessid
    wireless-key 123456789e
```
- For wireless interfaces or virtual interfaces, before configuring layer 3 through DHCP or static address, you need to create a link connection for layer 2. ifupdown provides a hook mechanism for users to create link connections.
- Hooks for ifupdown before bring up are located at: `/etc/network/if-pre-up.d`

```python
# ls /etc/network/if-pre-up.d
bridge : Configure software bridge interface
wireless-tools: Configure wireless interface using iwconfig tool
wpasupplicant : Configure Wi-Fi interface in station mode
```
- For more information about Wi-Fi interface and virtual interface operations, see [Linux Wi-Fi Driver](linux_wifi_driver.html) and [Linux Virtual Interface](virtual_interface.html)
- Reference: [https://cumulusnetworks.github.io/ifupdown2/ifupdown2/userguide.html](https://cumulusnetworks.github.io/ifupdown2/ifupdown2/userguide.html)

## Network Manager

- [Network Manager](https://help.ubuntu.com/community/NetworkManager?action=show&redirect=WifiDocs%2FNetworkManager) is the default network management tool for Ubuntu desktop and server distributions from Ubuntu 15.04 to 20.04
- Supports connection types: ethernet, wireless, Mobile broadband, VPN, DSL
- Reference [Network Manager](https://help.ubuntu.com/community/NetworkManager?action=show&redirect=WifiDocs%2FNetworkManager)
## Systemd-networkd

## Netplan

## Netifd

