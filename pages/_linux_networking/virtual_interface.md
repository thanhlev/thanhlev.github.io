---
layout: default
title: "Virtual Interfaces in Linux"
short_description: "Ý nghĩa và cách tạo các loại virtual interface trên Linux"
status: "Done"
picture: "assets/images/4port_ethernet_card.webp"
commit1: "Add Document"
commit2: "Thêm mô tả docker dùng VETH"
commit3: "Add tunnel interface"
latest_release: "Add ipvlan interface"
index: 1
publish: true
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
| 0.1      | Feb-02-2023   | {{page.commit1}} |
| 0.2      | Feb-02-2023   | {{page.commit2}} |
| 0.3      | Feb-04-2023   | {{page.commit3}} |
| 0.34      | Feb-06-2023   | {{page.latest_release}} |

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
        <td >Bridge</td>
        <td>
          <h6>Tạo interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>brctl addbr br0
ip link add name br0 type bridge</code></pre>
            </div>
          <h6>Xóa interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>brctl delbr br0
ip link delete br0</code></pre>
            </div>
          <h6>Add interface vào bridge</h6>
            <div style="width:450px;overflow:auto">
<pre><code>brctl addif br0 eth1
ip link set eth1 master br0</code></pre>
            </div>
          <h6>Remove interface khỏi bridge</h6>
            <div style="width:450px;overflow:auto">
<pre><code>brctl delif br0 eth1
ip link set eth1 nomaster</code></pre>
            </div>
        </td>
        <td>Software bridge , L2 interface</td>
    </tr>
    <tr>
        <td>802.1Q VLAN</td>
        <td>
          <h6>Kiểm tra kernel đã enable chưa</h6>
            <div style="width:450px;overflow:auto">
<pre><code>modinfo 8021q</code></pre>
            </div>
          <h6>Tạo interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>vconfig add eth1 8
ip link add link eth1 name eth1.8 type vlan id 8</code></pre>
            </div>
        </td>
        <td>802.1Q VLAN interface, L2 interface</td>
    </tr>
    <tr>
        <td>MACVLAN</td>
        <td>
          <h6>Tạo interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>ip link add macvlan1@eth0 link eth0 type macvlan mode bridge</code></pre>
            </div>
        </td>
        <td>MACVLAN interface, Interface cần hỗ trợ mode: promiscuity, L2 interface</td>
    </tr>
    <tr>
        <td>IPVLAN</td>
        <td>
          <h6>Tạo interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>ip link add ipvlan1@eth0 link eth0 type ipvlan mode l2</code></pre>
            </div>
        </td>
        <td>Tương tự như macvlan, ipvlan hỗ trợ L2 và L3. Ở mode L2, các interface có cùng MAC nhưng khác nhau IP</td>
    </tr>
    <tr>
        <td>TUN</td>
        <td>
          <h6>Tạo interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>ip tuntap add name tun0 mode tun</code></pre>
            </div>
        </td>
        <td>- Chỉ chấp nhận các gói tin ở L3<br>- Không thể thêm vào bridge<br>- Không thể phát các gói tin broadcast<br>- Thường dùng cho các VPN connection</td>
    </tr>
    <tr>
        <td>TAP</td>
        <td>
          <h6>Tạo interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>ip tuntap add name tap0 mode tap</code></pre>
            </div>
        </td>
        <td>- Hoạt động ở L2<br>- Có thể thêm vào bridge<br>- Có thể phát các gói tin broadcast<br>- Thường dùng trong hệ thống máy ảo</td>
    </tr>
    <tr>
        <td>VETH</td>
        <td>
          <h6>Tạo interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>ip link add veth1 type veth peer name veth2</code></pre>
            </div>
        </td>
        <td>- Tạo ra 1 cặp interface ảo có link connection với nhau<br>
        - Docker bridge mode dùng config này, veth0 được bind vào container,<br>
        veth1 được add vào member của bridge <code>docker0</code><br>
        </td>
    </tr>
    <tr>
        <td>TUNNEL</td>
        <td>
          <h6>Tạo interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>ip tunnel add tunnel0 mode sit ttl $TUNTTL remote $ISPBRIP local $WAN4IP</code></pre>
            </div>
          <h6>Xóa interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>ip tunnel del tunnel0</code></pre>
            </div>
        </td>
        <td>- Tạo tunnel interface, các mode: ipip | gre | sit | isatap | vti | ip6ip6 | ipip6 |
               ip6gre | vti6 | any<br>
        </td>
    </tr>
  </tbody>
</table>

