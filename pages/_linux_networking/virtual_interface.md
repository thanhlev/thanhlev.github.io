---
layout: default
title: "Virtual Interfaces in Linux"
short_description: "Ý nghĩa và cách tạo các loại virtual interface trên Linux"
status: "In Progress"
picture: "assets/images/4port_ethernet_card.webp"
latest_release: "Add Document"
videos: []
---

# Virtual Interfaces in Linux
{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------

## Revision history

| Revision | Date          | Remark      |
|:---------|:------------- |:------------|
| 0.1      | Feb-02-2023   | {{page.latest_release}} |

## Ý nghĩa và cách tạo các loại virtual interface trên Linux

<table>
  <thead>
    <tr>
      <th>Loại</th>
      <th>Cách tạo </th>
      <th>Ý nghĩa</th>
    </tr>
  </thead>

  <tbody>
    <tr>
        <td>Bridge</td>
        <td>
          <p><b>Tạo interface</b></p>
            <code>brctl addbr br0 </code> hoặc<br>
            <code>ip link add name br0 type bridge</code><br><br>
          <p><b>Xóa interface</b></p>
            <code>brctl delbr br0 </code> hoặc<br>
            <code>ip link delete br0</code><br><br>
          <p><b>Add interface vào bridge</b></p>
            <code>brctl addif br0 eth1 </code> hoặc<br>
            <code>ip link set eth1 master br0</code><br><br>
          <p><b>Remove interface khỏi bridge</b></p>
            <code>brctl delif br0 eth1 </code> hoặc<br>
            <code>ip link set eth1 nomaster</code>
        </td>
        <td>Software bridge , L2 interface</td>
    </tr>
    <tr>
        <td>802.1Q VLAN</td>
        <td>
          <p><b>Kiểm tra kernel đã enable chưa</b></p>
              <code>modinfo 8021q</code><br><br>
          <p><b>Tạo interface</b></p>
            <code>vconfig add eth1 8</code> hoặc<br>
            <code>ip link add link eth1 name eth1.8 type vlan id 8</code><br><br>
        </td>
        <td>802.1Q VLAN interface, L2 interface</td>
    </tr>
    <tr>
        <td>MACVLAN</td>
        <td>
          <p><b>Tạo interface</b></p>
            <code>ip link add mymacvlan1 link wlan0 type macvlan mode bridge</code><br><br>
        </td>
        <td>MACVLAN interface, Interface cần hỗ trợ mode: promiscuity, L2 interface</td>
    </tr>
    <tr>
        <td>TUN</td>
        <td>
          <p><b>Tạo interface</b></p>
            <code>ip tuntap add name tun0 mode tun</code><br><br>
        </td>
        <td>- Chỉ chấp nhận các gói tin ở L3<br>- Không thể thêm vào bridge<br>- Không thể phát các gói tin broadcast<br>- Thường dùng cho các VPN connection</td>
    </tr>
    <tr>
        <td>TAP</td>
        <td>
          <p><b>Tạo interface</b></p>
            <code>ip tuntap add name tap0 mode tap</code><br><br>
        </td>
        <td>- Hoạt động ở L2<br>- Có thể thêm vào bridge<br>- Có thể phát các gói tin broadcast<br>- Thường dùng trong hệ thống máy ảo</td>
    </tr>
    <tr>
        <td>VETH</td>
        <td>
          <p><b>Tạo interface</b></p>
            <code>ip link add veth1 type veth peer name veth2</code><br><br>
        </td>
        <td>Tạo ra 1 cặp interface ảo có link connection với nhau</td>
    </tr>
  </tbody>
</table>

