---
layout: default
title: "Linux Network Management"
short_description: "ifupdown, NetworkManager, systemd-networkd, Netplan and OpenWrt's netifd: who configures the interface after the driver"
picture: "assets/images/network_management_cover.jpg"   # 2026-11-23 cover, story_cover.py
status: "Done"
index: 2
latest_release: "2026-11-22: rewritten as a STAR story"
publish: true
tags: [networking, linux]
permalink: /linux_networking/network-management   # 2026-11-27: = the URL the collection default gave it; explicit so it never moves
---

# Linux Network Management
{: .no_toc }

![Linux networking cover, "Network management": 5 managers, 5 formats, who brings the interface up]({{ '/assets/images/network_management_cover.jpg' | relative_url }})
*Five managers, five config formats, one rule: one owner per interface.*

## Table of contents
{: .no_toc }

1. TOC
{:toc}

---

## Situation

The driver posts on this site stop at the point where the driver has registered `eth0` or `wlan0` with the kernel. After that, someone still has to bring the interface up and give it an address, and depending on the distro that someone is different: `/etc/network/interfaces` on Debian, `nmcli` on a desktop, YAML under `/etc/netplan/` on Ubuntu, `uci` on an OpenWrt router. Earlier versions of this page had the headings for them and not much under them.

## Task

Go through the five common network managers, with real config for the common cases (static, DHCP, Wi-Fi, VLAN, bridge, bond, WireGuard), and work out which one to pick and how they can share one machine without fighting.

## Action

### Who brings the interface up

The answer depends on the distro, and there are five common answers.

| Tool | Since | Where you meet it | Config |
|------|-----|-----------------|-----------------|
| ifupdown | 1990s | Debian, older Raspberry Pi OS, embedded | `/etc/network/interfaces` |
| NetworkManager | 2004 | desktops, laptops, RHEL/Fedora | `/etc/NetworkManager/` |
| systemd-networkd | 2014 | servers, containers, headless boxes | `/etc/systemd/network/` |
| Netplan | 2017 | Ubuntu; writes config for NM or networkd | `/etc/netplan/` |
| netifd | 2012 | OpenWrt routers | `/etc/config/network` |

### Ifupdown

After the driver has registered the net interface with the kernel, `ifup` brings it up and configures it, using what it reads from `/etc/network/interfaces`. Ubuntu moved away from this in 17.10 (to Netplan), but Debian and a lot of embedded systems still use it.

```bash
# Static IP
auto eth0
iface eth0 inet static
    address 192.168.0.111
    netmask 255.255.255.0
    gateway 192.168.0.1
    dns-nameservers 8.8.8.8 8.8.4.4
```

```bash
# DHCP
auto eth0
iface eth0 inet dhcp
```

```bash
# Wi-Fi interface (wireless-tools style, i.e. WEP/open networks only)
auto wlan0
iface wlan0 inet dhcp
    wireless-essid myessid
    wireless-key 123456789e
```

```bash
# VLAN interface (needs the vlan package)
auto eth0.100
iface eth0.100 inet static
    address 10.0.100.1
    netmask 255.255.255.0
    vlan-raw-device eth0
```

```bash
# Bridge interface (needs bridge-utils)
auto br0
iface br0 inet static
    address 192.168.1.1
    netmask 255.255.255.0
    bridge_ports eth0 eth1
    bridge_stp on
    bridge_fd 0
```

#### Hooks

For Wi-Fi or virtual interfaces there's a step before L3: the L2 link has to exist first (associate with the AP, create the bridge). ifupdown does that through hook scripts, run in alphabetical order from these directories:

| Directory | Runs |
|-----------|------|
| `/etc/network/if-pre-up.d/` | before the interface comes up |
| `/etc/network/if-up.d/` | after it's up |
| `/etc/network/if-down.d/` | before it goes down |
| `/etc/network/if-post-down.d/` | after it's down |

An example list of pre-up hooks:

```bash
# ls /etc/network/if-pre-up.d
bridge           # Configure software bridge interface
wireless-tools   # Configure wireless interface using iwconfig tool
wpasupplicant    # Configure Wi-Fi interface in station mode
```

That's how the `bridge_ports` and `wireless-*` lines above do anything: the packages install a hook that reads those options.

```bash
sudo ifup eth0
sudo ifdown eth0
sudo ifdown -a && sudo ifup -a    # everything marked auto
ifquery eth0                      # what ifupdown thinks the config is
```

More on the L2 side: [Linux Wi-Fi Driver]({{ site.baseurl }}{% link _linux_networking/linux_wifi_driver.md %}) (in Vietnamese) and [Virtual Interfaces in Linux]({{ site.baseurl }}{% link _linux_networking/virtual_interface.md %}).

Reference: [ifupdown2 User Guide](https://cumulusnetworks.github.io/ifupdown2/ifupdown2/userguide.html)

### NetworkManager

[NetworkManager](https://networkmanager.dev/) is a daemon built for machines whose network changes all the time: a laptop moving between Wi-Fi networks, a desktop with a VPN, a box with several profiles. It's the default on most desktop distros (Ubuntu, Fedora, Arch) and on RHEL. On Ubuntu it's still what runs on the desktop, just configured through Netplan since 17.10.

It handles Ethernet, Wi-Fi, mobile broadband, VPNs, DSL, bridges, bonds and VLANs. Everything goes through a D-Bus API, so the GNOME settings panel, `nm-applet`, `nmtui` and `nmcli` are all just clients of the same daemon. Profiles live in `/etc/NetworkManager/system-connections/`.

```
┌─────────────────────────────────────────────────────┐
│                   Applications                       │
│  (nm-applet, GNOME Settings, nmtui, nmcli)         │
└────────────────────────┬────────────────────────────┘
                         │ D-Bus
┌────────────────────────▼────────────────────────────┐
│              NetworkManager Daemon                    │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Plugins  │  │ Profiles │  │  DNS Manager     │  │
│  │(ifupdown,│  │ (keyfile,│  │  (systemd-resolved│  │
│  │ keyfile) │  │  ifcfg)  │  │   dnsmasq, etc.) │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│              Kernel (netlink, nl80211, etc.)          │
└──────────────────────────────────────────────────────┘
```

#### nmcli

```bash
nmcli connection show
nmcli connection show --active
nmcli device status
nmcli device show eth0

nmcli device wifi list
nmcli device wifi connect "MySSID" password "mypassword"

# Static Ethernet profile
nmcli connection add type ethernet con-name "office" ifname eth0 \
    ipv4.addresses "192.168.1.100/24" \
    ipv4.gateway "192.168.1.1" \
    ipv4.dns "8.8.8.8,8.8.4.4" \
    ipv4.method manual

# DHCP Ethernet profile
nmcli connection add type ethernet con-name "home" ifname eth0 \
    ipv4.method auto

nmcli connection modify "office" ipv4.dns "1.1.1.1,1.0.0.1"
nmcli connection up "office"
nmcli connection down "office"
nmcli connection delete "office"
```

Bridges, bonds, VLANs and WireGuard are profiles too:

```bash
# Bridge with two ports
nmcli connection add type bridge con-name br0 ifname br0 \
    ipv4.addresses "192.168.1.1/24" ipv4.method manual
nmcli connection add type bridge-slave con-name br0-port1 ifname eth0 master br0
nmcli connection add type bridge-slave con-name br0-port2 ifname eth1 master br0

# Bond (active-backup)
nmcli connection add type bond con-name bond0 ifname bond0 \
    bond.options "mode=active-backup,miimon=100"
nmcli connection add type bond-slave con-name bond0-port1 ifname eth0 master bond0
nmcli connection add type bond-slave con-name bond0-port2 ifname eth1 master bond0

# VLAN
nmcli connection add type vlan con-name vlan100 dev eth0 id 100 \
    ipv4.addresses "10.0.100.1/24" ipv4.method manual

# WireGuard
nmcli connection add type wireguard con-name wg0 ifname wg0 \
    wireguard.private-key "$(wg genkey)"
```

#### What a profile looks like on disk

```ini
# /etc/NetworkManager/system-connections/office.nmconnection
[connection]
id=office
type=ethernet
interface-name=eth0
autoconnect=true
autoconnect-priority=100

[ipv4]
method=manual
address1=192.168.1.100/24,192.168.1.1
dns=8.8.8.8;8.8.4.4;

[ipv6]
method=auto
```

#### Keeping it away from interfaces it shouldn't touch

NetworkManager will happily try to manage Docker's bridges and veths. Tell it not to:

```ini
# /etc/NetworkManager/NetworkManager.conf
[main]
plugins=keyfile

[keyfile]
unmanaged-devices=interface-name:docker*;interface-name:veth*;interface-name:br-*
```

Reference: [NetworkManager documentation](https://networkmanager.dev/docs/)

### Systemd-networkd

The systemd one. It watches for network devices, configures the ones that match a file, and can create virtual devices itself. No GUI, nothing interactive: you write files, it applies them. That makes it a good fit for servers, containers, and anything set up by automation (cloud-init, Ansible). DNS goes to `systemd-resolved`. For Wi-Fi it needs `wpa_supplicant` or `iwd` next to it.

Files go in `/etc/systemd/network/` (yours) or `/run/systemd/network/` (generated at runtime). They're read in lexical order, hence the number prefixes.

| Extension | What it does |
|-----------|---------|
| `.network` | configure a device that exists (addresses, routes, DNS) |
| `.netdev` | create a virtual device |
| `.link` | low-level link settings (MAC, MTU, name) |

```ini
# /etc/systemd/network/20-wired.network
[Match]
Name=eth0

[Network]
DHCP=yes
DNS=8.8.8.8
DNS=8.8.4.4

[DHCPv4]
UseDNS=false
RouteMetric=100
```

```ini
# /etc/systemd/network/20-static.network
[Match]
Name=eth0

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8
DNS=1.1.1.1

[Route]
Destination=10.0.0.0/8
Gateway=192.168.1.254
```

A virtual device is usually a `.netdev` (create it) plus a `.network` (configure it). A bridge with `eth0` as its port:

```ini
# /etc/systemd/network/25-bridge.netdev
[NetDev]
Name=br0
Kind=bridge

[Bridge]
STP=true
ForwardDelay=0
```

```ini
# /etc/systemd/network/25-bridge.network
[Match]
Name=br0

[Network]
Address=192.168.1.1/24
```

```ini
# /etc/systemd/network/30-bridge-port.network
[Match]
Name=eth0

[Network]
Bridge=br0
```

Bond, VLAN and WireGuard follow the same pattern. Note that the VLAN also needs `VLAN=vlan100` in the `.network` file of its parent (`eth0`), otherwise it's never created.

```ini
# /etc/systemd/network/25-bond.netdev
[NetDev]
Name=bond0
Kind=bond

[Bond]
Mode=802.3ad
MIIMonitorSec=100ms
LACPTransmitRate=fast
```

```ini
# /etc/systemd/network/25-vlan100.netdev
[NetDev]
Name=vlan100
Kind=vlan

[VLAN]
Id=100
```

```ini
# /etc/systemd/network/25-vlan100.network
[Match]
Name=vlan100

[Network]
Address=10.0.100.1/24
```

```ini
# /etc/systemd/network/25-wireguard.netdev
[NetDev]
Name=wg0
Kind=wireguard

[WireGuard]
PrivateKey=<base64-private-key>
ListenPort=51820

[WireGuardPeer]
PublicKey=<base64-public-key>
AllowedIPs=10.0.0.0/24
Endpoint=203.0.113.1:51820
PersistentKeepalive=25
```

```bash
sudo systemctl restart systemd-networkd
networkctl list
networkctl status
networkctl status eth0
networkctl reload              # re-read files
networkctl reconfigure eth0    # re-apply to one link

resolvectl status
resolvectl query example.com
resolvectl dns eth0 8.8.8.8 8.8.4.4
resolvectl flush-caches
```

Reference: [systemd-networkd](https://www.freedesktop.org/software/systemd/man/latest/systemd-networkd.html)

### Netplan

Netplan is easy to misread: it doesn't manage anything. It's a YAML front end: you describe the network once, `netplan generate` turns it into config for a **renderer** (systemd-networkd or NetworkManager), and that daemon does the work. Ubuntu has used it since 17.10, with networkd as the renderer on servers and NetworkManager on desktops.

```
┌──────────────────────────┐
│   /etc/netplan/*.yaml    │   ← You write this
└────────────┬─────────────┘
             │  netplan generate
┌────────────▼─────────────┐
│   Backend config files    │   ← Generated automatically
│  (systemd-networkd or NM) │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│  Network daemon applies   │
└──────────────────────────┘
```

So when something's wrong on an Ubuntu server, the generated files in `/run/systemd/network/` are where to look, and `networkctl` is the tool, not Netplan.

```yaml
# /etc/netplan/01-ethernet.yaml
network:
  version: 2
  renderer: networkd    # or NetworkManager
  ethernets:
    eth0:
      dhcp4: true
      dhcp6: false
```

```yaml
# /etc/netplan/01-static.yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
        - to: 10.0.0.0/8
          via: 192.168.1.254
          metric: 200
      nameservers:
        addresses:
          - 8.8.8.8
          - 1.1.1.1
        search:
          - example.com
```

```yaml
# /etc/netplan/02-wifi.yaml
network:
  version: 2
  renderer: NetworkManager
  wifis:
    wlan0:
      dhcp4: true
      access-points:
        "HomeNetwork":
          password: "secretpassword"
        "OfficeWPA-Enterprise":
          auth:
            key-management: eap
            identity: "user@example.com"
            password: "password"
```

```yaml
# /etc/netplan/03-bridge.yaml
network:
  version: 2
  bridges:
    br0:
      interfaces:
        - eth0
        - eth1
      addresses:
        - 192.168.1.1/24
      parameters:
        stp: true
        forward-delay: 0
```

```yaml
# /etc/netplan/03-bond.yaml
network:
  version: 2
  bonds:
    bond0:
      interfaces:
        - eth0
        - eth1
      addresses:
        - 192.168.1.100/24
      parameters:
        mode: 802.3ad
        lacp-rate: fast
        mii-monitor-interval: 100
      routes:
        - to: default
          via: 192.168.1.1
```

```yaml
# /etc/netplan/04-vlans.yaml
network:
  version: 2
  vlans:
    vlan100:
      id: 100
      link: eth0
      addresses:
        - 10.0.100.1/24
    vlan200:
      id: 200
      link: eth0
      dhcp4: true
```

```bash
sudo netplan try        # apply, roll back after 120 s unless you confirm
sudo netplan apply
sudo netplan generate   # write backend config only
sudo netplan --debug generate
sudo netplan get        # merged config
sudo netplan status     # newer versions only
```

Things that bite:

- YAML indentation is spaces, consistently. A tab and nothing works.
- The files can hold Wi-Fi passwords in clear text, so they should be mode `600` (newer Netplan warns about it).
- `renderer` can be set per file or per device. Mixing them works, but two files fighting over one interface is a mess to debug.
- On a remote machine use `netplan try`, never straight `apply`. If the new config cuts you off, it rolls back by itself.

Reference: [Netplan documentation](https://netplan.readthedocs.io/)

### Netifd

OpenWrt's network daemon, and the only one there. It's a small C program, which matters on a router with 64 MB of RAM. Config is UCI (`/etc/config/network`); `netifd` turns it into devices (physical, bridge, VLAN), interfaces (the L3 part) and protocol handlers (static, dhcp, pppoe, wireguard, ...), reacts to hotplug events, and tells the firewall which zone each interface belongs to.

```
┌──────────────────────────────────────────────────┐
│                  UCI Configuration                 │
│              /etc/config/network                   │
└────────────────────────┬─────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────┐
│                    netifd                          │
│                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────┐  │
│  │   Devices   │  │  Interfaces  │  │ Proto  │  │
│  │ (physical,  │  │  (logical,   │  │Handlers│  │
│  │  bridge,    │  │   L3 config) │  │(dhcp,  │  │
│  │  bond, vlan)│  │              │  │ pppoe, │  │
│  └─────────────┘  └──────────────┘  │ static)│  │
│                                      └────────┘  │
└────────────────────────┬─────────────────────────┘
                         │ netlink
┌────────────────────────▼─────────────────────────┐
│                     Kernel                         │
└──────────────────────────────────────────────────┘
```

A typical `/etc/config/network`. The two `wan` blocks are alternatives (DHCP or PPPoE), not both at once:

```bash
# /etc/config/network

# Loopback
config interface 'loopback'
    option device 'lo'
    option proto 'static'
    option ipaddr '127.0.0.1'
    option netmask '255.0.0.0'

# LAN (bridge of multiple ports)
config device
    option type 'bridge'
    option name 'br-lan'
    list ports 'eth0.1'
    list ports 'eth0.2'
    list ports 'eth0.3'
    list ports 'eth0.4'

config interface 'lan'
    option device 'br-lan'
    option proto 'static'
    option ipaddr '192.168.1.1'
    option netmask '255.255.255.0'
    option ip6assign '60'

# WAN (DHCP from ISP)
config interface 'wan'
    option device 'eth1'
    option proto 'dhcp'

# WAN6 (DHCPv6)
config interface 'wan6'
    option device 'eth1'
    option proto 'dhcpv6'

# ...or PPPoE instead (common for DSL/fibre)
config interface 'wan'
    option proto 'pppoe'
    option device 'eth1'
    option username 'user@isp.com'
    option password 'secret'
    option keepalive '5 3'

# VLAN
config device
    option type '8021q'
    option name 'eth0.100'
    option ifname 'eth0'
    option vid '100'

config interface 'mgmt'
    option device 'eth0.100'
    option proto 'static'
    option ipaddr '10.0.100.1'
    option netmask '255.255.255.0'

# Static route
config route
    option interface 'lan'
    option target '10.0.0.0/8'
    option gateway '192.168.1.254'
    option metric '100'

# WireGuard VPN
config interface 'wg0'
    option proto 'wireguard'
    option private_key '<base64-key>'
    option listen_port '51820'
    list addresses '10.0.0.1/24'

config wireguard_wg0
    option public_key '<peer-base64-key>'
    option endpoint_host '203.0.113.1'
    option endpoint_port '51820'
    list allowed_ips '10.0.0.0/24'
    option persistent_keepalive '25'
```

```bash
/etc/init.d/network restart
/etc/init.d/network reload      # gentler than restart
ifup lan
ifdown wan
ifstatus wan                    # JSON
ubus call network.interface dump

# Change something with uci and apply it
uci set network.lan.ipaddr='192.168.2.1'
uci set network.lan.netmask='255.255.255.0'
uci commit network
/etc/init.d/network reload
```

When an interface goes up or down, netifd runs the scripts in `/etc/hotplug.d/iface/`. For example, logging the new WAN address:

```bash
# /etc/hotplug.d/iface/99-custom
#!/bin/sh
[ "$ACTION" = "ifup" ] && [ "$INTERFACE" = "wan" ] && {
    logger "WAN is up with IP: $(ifstatus wan | jsonfilter -e '@["ipv4-address"][0].address')"
}
```

Reference: [OpenWrt network configuration](https://openwrt.org/docs/guide-user/network/network_configuration)

### Which one, and can they share a machine?

| Situation | What I'd use |
|----------|-----------------|
| OpenWrt router | netifd (no choice) |
| Debian server, keep it minimal | ifupdown |
| Ubuntu server | Netplan with networkd |
| Desktop / laptop | NetworkManager (through Netplan on Ubuntu) |
| Containers, cloud VMs | systemd-networkd |
| Set up by cloud-init or Ansible | systemd-networkd or Netplan |

They can live on one machine as long as each interface has exactly one owner. NetworkManager skips whatever is in `unmanaged-devices`; networkd only touches interfaces matching a `.network` file; ifupdown only the ones in `/etc/network/interfaces`. Netplan can even send different devices to different renderers:

```yaml
# Netplan: networkd for the wired port, NetworkManager for Wi-Fi
network:
  version: 2
  ethernets:
    eth0:
      renderer: networkd
      dhcp4: true
  wifis:
    wlan0:
      renderer: NetworkManager
      dhcp4: true
      access-points:
        "Home": {password: "secret"}
```

Two managers on one interface is the classic cause of an address that keeps coming back after you delete it, or a DHCP lease that flips every few minutes. `networkctl list` and `nmcli device status` both say which interfaces they think they own; checking both is the first thing I'd do.

## Result

The five managers do the same job from five config formats: ifupdown runs scripts from `/etc/network/interfaces` and its hook directories, NetworkManager keeps profiles and `nmcli` edits them, systemd-networkd matches `.netdev`/`.network` files to interfaces, Netplan writes config for one of those two, and netifd reads `/etc/config/network` through `uci`. Which one I'd use comes down to the distro and the kind of box (the table above). The rule that matters more than the choice is one owner per interface: two managers on the same interface is where the address that keeps coming back and the flipping DHCP lease come from.

## What I'd do next

ConnMan and `iwd`'s own network config, which some embedded images ship instead of all of the above.

## References

- [ifupdown2 User Guide](https://cumulusnetworks.github.io/ifupdown2/ifupdown2/userguide.html)
- [NetworkManager documentation](https://networkmanager.dev/docs/)
- [systemd-networkd man page](https://www.freedesktop.org/software/systemd/man/latest/systemd-networkd.html)
- [Netplan documentation](https://netplan.readthedocs.io/)
- [OpenWrt network configuration](https://openwrt.org/docs/guide-user/network/network_configuration)
