---
layout: default
title: "Docker Networking"
short_description: "Different types of Docker networks"
status: "Done"
picture: "assets/images/docker_network.png"
latest_release: "Initialize document"
index: 4
publish: true
---

# Different Types of Docker Networks

{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------
## Docker Network Definitions

<table class="project_table">
  <thead>
    <tr>
      <th>Traditional</th>
      <th>Docker</th>
      <th>Explanation</th>
    </tr>
  </thead>

  <tbody>
    <tr>
        <td>NAT</td>
        <td><a target="_blank" href="https://docs.docker.com/network/bridge/">bridge</a></td>
        <td>Host machine creates a bridge (docker0) and performs NAT on this interface, each container created is a member of the bridge</td>
    </tr>
    <tr>
        <td>???</td>
        <td><a target="_blank" href="https://docs.docker.com/network/host/">host</a></td>
        <td>Uses the host's network stack directly, container uses the host's IP and ports directly</td>
    </tr>
    <tr>
        <td>VLAN</td>
        <td><a target="_blank" href="https://docs.docker.com/network/ipvlan/">ipvlan</a></td>
        <td>Routes packets based on VLAN ID in the ethernet frame</td>
    </tr>
    <tr>
        <td>MACVLAN</td>
        <td><a target="_blank" href="https://docs.docker.com/network/macvlan/">macvlan</a></td>
        <td>Creates virtual interfaces from the host interface `ip link add mymacvlan1 link enp4s0 type macvlan mode bridge`</td>
    </tr>
  </tbody>
</table>
