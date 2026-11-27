---
layout: default
title: "Docker Networking"
short_description: "What each Docker network driver builds out of bridges, veth, macvlan and iptables"
status: "Done"
picture: "assets/images/docker_network_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: rewritten as a STAR story"
index: 6
publish: true
tags: [networking, linux, docker]
permalink: /linux_networking/docker-network   # 2026-11-27: = the URL the collection default gave it; explicit so it never moves
description: "What each Docker network driver builds out of bridges, veth, macvlan and iptables"
date: 2023-02-04
last_modified_at: 2026-11-27
---

# Docker Networking: what each driver really builds
{: .no_toc }

![Linux networking cover, "Docker networking": 6 drivers, what each driver builds]({{ '/assets/images/docker_network_cover.jpg' | relative_url }})
*Six drivers, all built from bridges, veth, macvlan and iptables rules you can look at.*

## Table of contents
{: .no_toc }

1. TOC
{:toc}

---

## Situation

Every machine I run Docker on ends up with a `docker0`, a few `br-<id>` bridges, a row of `vethXXXX` interfaces in `ip link`, and a pile of iptables rules I never wrote. Then the questions start: why can't the host ping the macvlan container, why do names resolve on one network and not on another, why does `-p` do nothing with `--network host`. I wanted to stop guessing at those.

## Task

Work out, driver by driver, which ordinary Linux pieces Docker builds, show the commands that create and inspect them, and write down what breaks with each one and why.

## Action

### How Docker networking works

Short answer: Docker doesn't have its own network stack. Each container lives in its own **network namespace** (own interfaces, routes, iptables rules, sockets), and the driver decides which ordinary Linux pieces connect that namespace to the outside: a bridge plus veth pairs, a macvlan, an ipvlan, a VXLAN tunnel, or nothing. If you know those pieces (see [Virtual Interfaces in Linux]({{ site.baseurl }}{% link _linux_networking/virtual_interface.md %})), Docker networking stops being magic.

Each Docker driver next to the "traditional" networking idea it maps to. `host` has no classic equivalent: it doesn't build anything, it just skips the namespace.

| Traditional | Docker driver | What it is |
|-------------|---------------|------------|
| NAT router | [bridge](https://docs.docker.com/network/bridge/) | Host creates a bridge (`docker0`) and NATs it out; every container is a port on that bridge |
| nothing (no namespace) | [host](https://docs.docker.com/network/host/) | Container uses the host's network stack directly: host IP, host ports |
| VLAN-ish, L3 | [ipvlan](https://docs.docker.com/network/ipvlan/) | Sub-interfaces of a host NIC that share its MAC, told apart by IP |
| MACVLAN | [macvlan](https://docs.docker.com/network/macvlan/) | Sub-interfaces of a host NIC with their own MAC, like `ip link add mymacvlan1 link enp4s0 type macvlan mode bridge` |
| VXLAN overlay | overlay | L2 frames tunnelled in UDP between Docker hosts |
| unplugged cable | none | Only `lo` inside the container |

And the same drivers compared on what you usually care about:

| Driver | Isolation | Container gets its own IP | Typical use |
|--------|-----------|---------------------------|-------------|
| bridge | namespace + NAT | yes, on a private subnet | the default, one host |
| host | none | no, shares the host IP | when the NAT/veth hop is in the way |
| macvlan | namespace, own MAC | yes, on the LAN subnet | container must look like a real box on the LAN |
| ipvlan | namespace, shared MAC | yes, on the LAN subnet | like macvlan where extra MACs aren't allowed (Wi-Fi, cloud) |
| overlay | namespace + VXLAN | yes, on the overlay subnet | several hosts (Swarm) |
| none | everything | no | no network at all, or you plumb it by hand |

### Bridge (the default)

This is the one you get without asking. A Linux bridge on the host, a veth pair per container, and NAT on the way out.

```
┌──────────────────────────────────────────────────────────────────┐
│                            Host                                    │
│                                                                    │
│    ┌────────────────────────────────────────────────────┐        │
│    │              docker0 (Linux bridge)                  │        │
│    │              172.17.0.1/16                           │        │
│    └───┬──────────────┬──────────────┬──────────────────┘        │
│        │              │              │                             │
│     vethXXX        vethYYY        vethZZZ                        │
│        │              │              │                             │
│  ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐                     │
│  │Container A│ │Container B│ │Container C│                       │
│  │eth0       │ │eth0       │ │eth0       │                       │
│  │172.17.0.2 │ │172.17.0.3 │ │172.17.0.4 │                       │
│  └───────────┘ └───────────┘ └───────────┘                       │
│                                                                    │
│    iptables NAT (MASQUERADE):                                     │
│    172.17.0.0/16 → eth0 (host public IP)                         │
│                                                                    │
│    ┌──────────┐                                                   │
│    │   eth0   │ ← host physical interface (e.g., 192.168.1.100) │
│    └────┬─────┘                                                   │
└─────────┼─────────────────────────────────────────────────────────┘
          │
     Physical Network
```

What happens when a container starts on it:

1. Docker makes sure the bridge exists (`docker0` for the default network, `br-<id>` for networks you create).
2. The container gets a fresh network namespace.
3. A veth pair is created. One end goes into the container and is renamed `eth0`, the other end becomes a port of the bridge.
4. Docker's IPAM hands out an address from the network's subnet (`172.17.0.0/16` for the default one).
5. A MASQUERADE rule NATs container traffic to the host's outgoing IP.
6. Every `-p host:container` adds a DNAT rule from the host port to the container IP.

```bash
# Custom bridge network with my own subnet
docker network create --driver bridge \
    --subnet 10.10.0.0/24 \
    --gateway 10.10.0.1 \
    my_bridge

# Run a container on it
docker run -d --network my_bridge --name web nginx

# Publish a port (default bridge)
docker run -d -p 8080:80 --name web nginx

# Plug a running container into one more network
docker network connect my_bridge existing_container

docker network inspect my_bridge
```

#### The iptables rules behind it

Roughly what Docker writes for the default bridge and one `-p 8080:80`. Newer Docker releases split this over more chains (and can use nftables), so take it as the shape and run `iptables-save | grep -i docker` on your own machine to see the real thing.

```bash
# NAT for outbound container traffic
-A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE

# Containers on the same bridge may talk to each other
-A FORWARD -i docker0 -o docker0 -j ACCEPT

# Containers may go out; replies may come back in
-A FORWARD -i docker0 ! -o docker0 -j ACCEPT
-A FORWARD -o docker0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# Port publishing: -p 8080:80
-A DOCKER -d 172.17.0.2/32 ! -i docker0 -o docker0 -p tcp -m tcp --dport 80 -j ACCEPT
-A DOCKER ! -i docker0 -p tcp -m tcp --dport 8080 -j DNAT --to-destination 172.17.0.2:80
```

Which chain each of these sits in, and why DNAT has to happen in PREROUTING, is the topic of [Linux Packet Filtering]({{ site.baseurl }}{% link _linux_networking/linux_table_chain.md %}).

#### Names only resolve on networks you create

This one catches people: on the default `docker0` network, containers can't find each other by name. On a network you created yourself, Docker runs an embedded DNS server at `127.0.0.11` inside each container, and container names resolve.

```bash
# Default bridge: only IPs (or the legacy --link)
# User-defined bridge: names just work
docker network create app_net
docker run -d --network app_net --name db postgres
docker run -d --network app_net --name web myapp
# inside "web": ping db  -> resolves to db's IP
```

| | Default (`docker0`) | User-defined |
|---|-------------------|--------------|
| DNS by container name | no | yes |
| Isolation from other containers | no, everyone shares it | per network |
| Connect/disconnect a running container | no | yes |
| Subnet/gateway | daemon-wide setting only | per network |
| Inter-container traffic (ICC) switch | global | per network |

### Host

No namespace, no bridge, no NAT. The container's processes use the host's interfaces, routes and iptables as if they ran on the host.

```
┌────────────────────────────────────────────┐
│                   Host                      │
│                                            │
│   ┌─────────────────────────────────────┐  │
│   │          Shared network stack        │  │
│   │                                     │  │
│   │   eth0: 192.168.1.100              │  │
│   │   lo: 127.0.0.1                    │  │
│   │                                     │  │
│   │   Host processes   Container procs  │  │
│   │   (sshd :22)       (nginx :80)     │  │
│   └─────────────────────────────────────┘  │
│                                            │
└────────────────────────────────────────────┘
```

```bash
docker run -d --network host --name web nginx
# nginx now listens on the host's port 80
```

What follows from that:

- `-p` makes no sense here and is ignored. The app binds host ports directly, so it fights host services (and other host-network containers) for the same port numbers.
- There's no extra hop at all, which is why people use it for things that bind lots of ports or ranges (SIP, some game servers), or that need to see and change the host's network config.
- You give up network isolation between the container and the host completely.
- On Docker Desktop (macOS/Windows) the "host" is the Linux VM Docker runs in, not your laptop. This driver mostly makes sense on a Linux host.

### MACVLAN

Each container gets its own MAC address and shows up on the LAN as one more device. No NAT: the container takes an address from the physical subnet, and anything on the LAN can reach it directly.

```
              Physical Network (192.168.1.0/24)
              Switch / Router
                    │
                    │
         ┌──────────┴──────────────────────────────┐
         │              eth0 (parent)               │
         └──┬──────────┬──────────┬────────────────┘
            │          │          │
     ┌──────▼───┐ ┌────▼─────┐ ┌─▼──────────┐
     │Container A│ │Container B│ │Container C │
     │MAC: unique│ │MAC: unique│ │MAC: unique │
     │192.168.1. │ │192.168.1. │ │192.168.1.  │
     │  50       │ │  51       │ │  52        │
     └───────────┘ └──────────┘ └────────────┘
```

```bash
docker network create -d macvlan \
    --subnet=192.168.1.0/24 \
    --gateway=192.168.1.1 \
    -o parent=eth0 \
    -o macvlan_mode=bridge \
    my_macvlan

docker run -d --network my_macvlan --ip 192.168.1.50 --name web nginx
# reachable at 192.168.1.50 from any device on the LAN
```

Put a dotted parent name and Docker creates the 802.1Q sub-interface (`eth0.100`) for you:

```bash
docker network create -d macvlan \
    --subnet=10.0.100.0/24 \
    --gateway=10.0.100.1 \
    -o parent=eth0.100 \
    macvlan_vlan100
```

Two things to know before choosing it:

- **It doesn't work over Wi-Fi.** The parent has to accept frames for several MACs (the kernel adds them to the NIC's address filter, or turns on promiscuous mode when the filter is full). On Wi-Fi the access point only talks to MACs that have associated with it, so frames from the extra container MACs go nowhere. Use ipvlan there.
- **The host can't reach its own macvlan containers** through `eth0`, and the containers can't reach the host. The why is in [Linux MacVLAN]({{ site.baseurl }}{% link _linux_networking/linux_macvlan.md %}). The usual fix is a macvlan "shim" on the host, so the host talks to the containers as a sibling instead of as the parent:

```bash
ip link add macvlan-shim link eth0 type macvlan mode bridge
ip addr add 192.168.1.200/32 dev macvlan-shim
ip link set macvlan-shim up
ip route add 192.168.1.50/32 dev macvlan-shim
ip route add 192.168.1.51/32 dev macvlan-shim
```

Where it fits: things that must sit on the LAN as their own box (a DHCP or DNS server, monitoring), or moving a service from a VM/bare metal while keeping its IP.

### IPVLAN

Same idea as macvlan, but every container shares the parent's MAC. The kernel tells them apart by IP instead of by MAC.

```
              Physical Network
                    │
         ┌──────────┴─────────────────────────────┐
         │        eth0 (parent)                    │
         │    MAC: AA:BB:CC:DD:EE:FF (shared)     │
         └──┬──────────┬──────────┬───────────────┘
            │          │          │
     ┌──────▼───┐ ┌────▼─────┐ ┌─▼──────────┐
     │Container A│ │Container B│ │Container C │
     │same MAC   │ │same MAC   │ │same MAC    │
     │10.0.0.10  │ │10.0.0.11  │ │10.0.0.12   │
     └───────────┘ └──────────┘ └────────────┘
```

| Mode | What it does |
|------|-------------|
| `l2` | containers on the parent's subnet, ARP works as usual |
| `l3` | parent routes for them, containers can be on other subnets, no ARP/broadcast between them |
| `l3s` | like `l3`, but packets go through netfilter/conntrack, so iptables rules apply |

```bash
# L2 mode
docker network create -d ipvlan \
    --subnet=192.168.1.0/24 \
    --gateway=192.168.1.1 \
    -o parent=eth0 \
    -o ipvlan_mode=l2 \
    my_ipvlan_l2

# L3 mode (containers can be on a different subnet;
# the rest of the network needs a route to 10.0.1.0/24 via this host)
docker network create -d ipvlan \
    --subnet=10.0.1.0/24 \
    -o parent=eth0 \
    -o ipvlan_mode=l3 \
    my_ipvlan_l3

docker run -d --network my_ipvlan_l2 --ip 192.168.1.60 --name app myimage
```

Since there's only one MAC on the wire, ipvlan works where macvlan can't: a Wi-Fi parent, cloud VMs that drop frames from unknown MACs, switch ports with a MAC limit. The price is that anything keyed on MAC (DHCP reservations, for one) sees every container as the same machine. And ipvlan has the same host-to-container blind spot as macvlan; the shim trick works with an ipvlan shim.

How I'd pick between the two:

| Situation | Pick |
|-----------|------|
| Wired Ethernet, containers should get DHCP leases of their own | macvlan |
| Parent is Wi-Fi | ipvlan |
| Cloud VM, or a switch port that limits MACs | ipvlan |
| Want iptables rules to apply to container traffic | ipvlan `l3s` (or macvlan) |

### Overlay

For containers on different hosts that should share one L2 network. Each host gets a VXLAN interface, frames between hosts are wrapped in UDP (port 4789). This is what Docker Swarm uses.

```
Host A (10.0.0.1)                              Host B (10.0.0.2)
┌──────────────────────────┐                   ┌──────────────────────────┐
│  Container A              │                   │  Container B              │
│  10.10.0.2               │                   │  10.10.0.3               │
│      │                    │                   │      │                    │
│  ┌───▼────────────────┐  │   VXLAN (UDP:4789)│  ┌───▼────────────────┐  │
│  │  br0 (overlay)     │  │◄─────────────────►│  │  br0 (overlay)     │  │
│  │  + vxlan interface │  │                   │  │  + vxlan interface │  │
│  └────────────────────┘  │                   │  └────────────────────┘  │
│                           │                   │                           │
│  eth0: 10.0.0.1          │                   │  eth0: 10.0.0.2          │
└──────────────────────────┘                   └──────────────────────────┘
              │                                               │
              └───────────── Physical Network ────────────────┘
```

1. On every host in the overlay, Docker creates a VXLAN interface and a bridge for that overlay.
2. Container veths attach to that bridge.
3. A frame for a container on another host is wrapped (VXLAN header + UDP + outer IP) and sent to that host's address.
4. The other host unwraps it and delivers it to the container.
5. Swarm's gossip protocol keeps every host's table of "which container MAC lives behind which host" (the VTEP state) up to date.

```bash
docker swarm init

# --attachable lets plain `docker run` containers join, not only services
docker network create --driver overlay --attachable my_overlay

docker service create --network my_overlay --name web --replicas 3 nginx
docker run -d --network my_overlay --name standalone alpine sleep 3600

# Encrypt the VXLAN traffic between hosts (IPsec ESP)
docker network create --driver overlay --opt encrypted my_secure_overlay
```

Practical notes: the hosts must let UDP 4789 (VXLAN), TCP/UDP 7946 (gossip) and TCP 2377 (Swarm management) through. The encapsulation adds 50 bytes per frame, so the MTU inside the overlay has to be smaller than on the wire, which is the first thing I'd check if big transfers stall while ping works. On a single host there's no reason to pay for any of this; a bridge does the job.

### None

Only `lo` inside the container.

```bash
docker run --network none --name isolated alpine ip addr show
# only lo: 127.0.0.1
```

Good for jobs that should never touch the network. It's also a clean starting point when you want to wire a container by hand with plain `ip` commands, which is a nice way to see that Docker isn't doing anything special:

{% raw %}
```bash
docker run -d --network none --name custom alpine sleep 3600

# Find the container's PID and expose its netns to `ip netns`
PID=$(docker inspect -f '{{.State.Pid}}' custom)
mkdir -p /var/run/netns
ln -s /proc/$PID/ns/net /var/run/netns/custom

# From here it's the same veth recipe as in "Virtual Interfaces"
ip link add veth-host type veth peer name veth-container
ip link set veth-container netns custom
ip addr add 10.0.0.1/24 dev veth-host
ip link set veth-host up
ip netns exec custom ip addr add 10.0.0.2/24 dev veth-container
ip netns exec custom ip link set veth-container up
ip netns exec custom ip route add default via 10.0.0.1
```
{% endraw %}

### Docker Compose

Compose makes one bridge network per project (`<project>_default`) unless you declare your own. Splitting into a front and back network looks like this:

```yaml
# docker-compose.yml
services:
  web:
    image: nginx
    ports:
      - "8080:80"
    networks:
      - frontend
      - backend

  api:
    image: myapi
    networks:
      - backend

  db:
    image: postgres
    networks:
      - backend

networks:
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 10.10.1.0/24
  backend:
    driver: bridge
    internal: true    # no route out (no MASQUERADE)
    ipam:
      config:
        - subnet: 10.10.2.0/24
```

Services on the same network find each other by service name. A service can sit on several networks (`web` above is on both). `internal: true` means that network has no way out to the internet, so `db` can't phone home even if something inside it tries.

### The kernel pieces underneath

| Kernel feature | Where Docker uses it |
|---------------|--------------|
| network namespace | one per container |
| veth pair | container ↔ bridge (bridge and overlay drivers) |
| Linux bridge | `docker0`, `br-<id>`, the per-overlay bridge |
| iptables `nat` | MASQUERADE out, DNAT for `-p` |
| iptables `filter` | ICC on/off, isolation between networks |
| macvlan | macvlan driver |
| ipvlan | ipvlan driver |
| VXLAN | overlay driver |

You can look at all of it with normal tools:

{% raw %}
```bash
bridge link show                 # bridges and their ports
ip link show type veth           # the host ends of the veth pairs
iptables -t nat -nvL             # what Docker added
iptables -t filter -nvL

# Get into a container's namespace with host tools
docker inspect -f '{{.State.Pid}}' <container>
nsenter -t <PID> -n ip addr show

ip -d link show type vxlan       # overlay tunnels
```
{% endraw %}

About speed: I haven't benchmarked the drivers against each other myself. The expected order is host (nothing in between), then macvlan/ipvlan (one sub-interface lookup), then bridge (veth + bridge + NAT), then overlay (all that plus encapsulation). If it matters for you, run `iperf3` between two containers on each driver before trusting anyone's percentages, including ones you find on blogs like this.

There's also `"iptables": false` in `/etc/docker/daemon.json`. It doesn't make anything faster in a way I could tell you; what it does is stop Docker from writing any NAT or filter rules, so published ports and outbound NAT stop working until you write the rules yourself.

### When something doesn't work

| Symptom | Usual cause | Check |
|---------|-------------|-------|
| Container can't reach the internet | NAT rule missing, or DNS | `docker exec <c> ping 8.8.8.8`, then `nslookup google.com` |
| Host can't reach a macvlan container | the parent/child limitation | add a macvlan shim (above) |
| Two containers can't reach each other | different networks, or ICC off | `docker network inspect`, are they on the same one? |
| `-p` doesn't work | port already used, or rule conflict | `iptables -t nat -nvL DOCKER`, `ss -tlnp` |
| Overlay containers on two hosts can't talk | firewall drops VXLAN | open UDP 4789, TCP/UDP 7946, TCP 2377 |
| Names don't resolve | container is on the default bridge | move it to a user-defined network |

{% raw %}
```bash
# Inside the container
docker exec <container> ip addr show
docker exec <container> ip route show
docker exec <container> cat /etc/resolv.conf
docker exec <container> ping <target>
docker exec <container> nslookup <other_container_name> 127.0.0.11

# On the host
iptables-save | grep -i docker
tcpdump -i docker0 -nn           # everything on the default bridge
tcpdump -i vethXXXXXX -nn        # one container's traffic
docker network ls
docker network inspect <network_name>

# Which networks is this container on?
docker inspect -f '{{json .NetworkSettings.Networks}}' <container> | jq
```
{% endraw %}

## Result

Docker networking isn't magic any more: it's a namespace per container plus a bridge and veth pairs, a macvlan, an ipvlan or a VXLAN tunnel, and iptables NAT/filter rules on the host, all of which `ip`, `bridge`, `iptables` and `nsenter` can show. Most of the surprises come straight from those pieces: macvlan and ipvlan can't reach their own host, macvlan can't work over Wi-Fi, names only resolve on user-defined networks, overlay needs a smaller MTU. I haven't measured the drivers against each other, so there's no speed number here.

The defaults I'd pick now:

- A user-defined bridge rather than `docker0`. You get DNS by name and per-network isolation for free.
- `internal: true` for anything backend-only, like a database network.
- Set the subnet explicitly. Docker's picks can collide with a VPN or the LAN you're on, and the symptoms of that are confusing.
- macvlan/ipvlan only when the container really has to be a box on the LAN; host network only when the extra hop is a measured problem.
- Overlay only when there really are several hosts.

## What I'd do next

Run `iperf3` between two containers on each driver on my own machine, so the speed order above becomes a measured one. Not covered here yet either: IPv6 on these networks, and the nftables backend of newer Docker releases.

## References

- [Docker networking documentation](https://docs.docker.com/network/)
- [Docker bridge driver](https://docs.docker.com/network/drivers/bridge/)
- [Docker macvlan driver](https://docs.docker.com/network/drivers/macvlan/)
- [Docker ipvlan driver](https://docs.docker.com/network/drivers/ipvlan/)
- [Docker overlay driver](https://docs.docker.com/network/drivers/overlay/)
- [Container Networking (by Michael Hausenblas)](https://www.oreilly.com/library/view/container-networking/9781492036845/)
- [Linux MacVLAN]({{ site.baseurl }}{% link _linux_networking/linux_macvlan.md %})
- [Linux Virtual Interfaces]({{ site.baseurl }}{% link _linux_networking/virtual_interface.md %})
