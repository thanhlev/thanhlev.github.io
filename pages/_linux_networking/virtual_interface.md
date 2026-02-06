---
layout: default
title: "Virtual Interfaces in Linux"
short_description: "Meaning and how to create various types of virtual interfaces on Linux"
status: "Done"
picture: "assets/images/4port_ethernet_card.webp"
commit1: "Add Document"
commit2: "Add description of Docker using VETH"
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

|| Revision | Date          | Remark      |
||:---------|:------------- |:------------|
|| 0.1      | Feb-02-2023   | {{page.commit1}} |
|| 0.2      | Feb-02-2023   | {{page.commit2}} |
|| 0.3      | Feb-04-2023   | {{page.commit3}} |
|| 0.34      | Feb-06-2023   | {{page.latest_release}} |

## Meaning and how to create various types of virtual interfaces on Linux

<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>How to create</th>
      <th>Meaning</th>
    </tr>
  </thead>

  <tbody>
    <tr>
        <td >Bridge</td>
        <td>
          <h6>Create interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>brctl addbr br0
ip link add name br0 type bridge</code></pre>
            </div>
          <h6>Delete interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>brctl delbr br0
ip link delete br0</code></pre>
            </div>
          <h6>Add interface to bridge</h6>
            <div style="width:450px;overflow:auto">
<pre><code>brctl addif br0 eth1
ip link set eth1 master br0</code></pre>
            </div>
          <h6>Remove interface from bridge</h6>
            <div style="width:450px;overflow:auto">
<pre><code>brctl delif br0 eth1
ip link set eth1 nomaster</code></pre>
            </div>
        </td>
        <td>Software bridge, L2 interface</td>
    </tr>
    <tr>
        <td>802.1Q VLAN</td>
        <td>
          <h6>Check if kernel is enabled</h6>
            <div style="width:450px;overflow:auto">
<pre><code>modinfo 8021q</code></pre>
            </div>
          <h6>Create interface</h6>
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
          <h6>Create interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>ip link add macvlan1@eth0 link eth0 type macvlan mode bridge</code></pre>
            </div>
        </td>
        <td>MACVLAN interface, Interface needs to support promiscuity mode, L2 interface</td>
    </tr>
    <tr>
        <td>IPVLAN</td>
        <td>
          <h6>Create interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>ip link add ipvlan1@eth0 link eth0 type ipvlan mode l2</code></pre>
            </div>
        </td>
        <td>Similar to macvlan, ipvlan supports L2 and L3. In L2 mode, interfaces have the same MAC but different IPs</td>
    </tr>
    <tr>
        <td>TUN</td>
        <td>
          <h6>Create interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>ip tuntap add name tun0 mode tun</code></pre>
            </div>
        </td>
        <td>- Only accepts L3 packets<br>- Cannot be added to bridge<br>- Cannot broadcast packets<br>- Commonly used for VPN connections</td>
    </tr>
    <tr>
        <td>TAP</td>
        <td>
          <h6>Create interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>ip tuntap add name tap0 mode tap</code></pre>
            </div>
        </td>
        <td>- Operates at L2<br>- Can be added to bridge<br>- Can broadcast packets<br>- Commonly used in virtual machine systems</td>
    </tr>
    <tr>
        <td>VETH</td>
        <td>
          <h6>Create interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>ip link add veth1 type veth peer name veth2</code></pre>
            </div>
        </td>
        <td>- Creates a pair of virtual interfaces with link connection to each other<br>
        - Docker bridge mode uses this config, veth0 is bound to container,<br>
        veth1 is added as member of bridge <code>docker0</code><br>
        </td>
    </tr>
    <tr>
        <td>TUNNEL</td>
        <td>
          <h6>Create interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>ip tunnel add tunnel0 mode sit ttl $TUNTTL remote $ISPBRIP local $WAN4IP</code></pre>
            </div>
          <h6>Delete interface</h6>
            <div style="width:450px;overflow:auto">
<pre><code>ip tunnel del tunnel0</code></pre>
            </div>
        </td>
        <td>- Create tunnel interface, modes: ipip | gre | sit | isatap | vti | ip6ip6 | ipip6 |
               ip6gre | vti6 | any<br>
        </td>
    </tr>
  </tbody>
</table>