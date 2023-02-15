---
layout: default
title: "Docker Networking"
short_description: "Các loại network khác nhau của Docker"
status: "Done"
picture: "assets/images/docker_network.png"
latest_release: "Initialize document"
index: 4
---

# Các loại network khác nhau của Docker

{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------
## Định nghĩa network của Docker

<table class="project_table">
  <thead>
    <tr>
      <th>Truyền thống</th>
      <th>Docker </th>
      <th>Giải thích</th>
    </tr>
  </thead>

  <tbody>
    <tr>
        <td>NAT</td>
        <td><a target="_blank" href="https://docs.docker.com/network/bridge/">bridge</a></td>
        <td>Host machine tạo 1 bridge (docker0) và NAT trên interface này, mỗi container tạo ra là 1 member của bridge  </td>
    </tr>
    <tr>
        <td>???</td>
        <td><a target="_blank" href="https://docs.docker.com/network/host/">host</a></td>
        <td>Dùng chính network stack của host, container dùng IP và port của host trực tiếp </td>
    </tr>
    <tr>
        <td>VLAN</td>
        <td><a target="_blank" href="https://docs.docker.com/network/ipvlan/">ipvlan</a></td>
        <td>Định tuyến gói tin dựa trên VLAN ID trong ethernet frame</td>
    </tr>
    <tr>
        <td>MACVLAN</td>
        <td><a target="_blank" href="https://docs.docker.com/network/macvlan/">macvlan</a></td>
        <td>Tạo interface ảo từ interface của host `ip link add mymacvlan1 link enp4s0 type macvlan mode bridge`</td>
    </tr>
  </tbody>
</table>
