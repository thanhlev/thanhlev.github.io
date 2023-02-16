---
layout: default
title: "Linux Tips"
short_description: "Các task hay dùng với Linux"
status: "In Progress"
picture: "assets/images/linux_tips.jpg"
latest_release: "Init document"
index: 2
---

# Linux tips
{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------
<table>
  <thead>
    <tr>
      <th>Items</th>
      <th>Details</th>
    </tr>
  </thead>

<tbody>
    <!-- Row 1 -->
    <tr>
        <td >
        <h6>Auto mount SSD at bootup</h6>
        </td>
        <td>
          <h6>Get the uuid of SSD</h6>
            <div style="width:650px;overflow:auto">
<pre><code>sudo blkid
ls -al /dev/disk/by-uuid/</code></pre>
            </div>
          <h6>Edit the file <code>/etc/fstab</code> </h6>
            <div style="width:650px;overflow:auto">
<pre><code>UUID=b071688a-414a-4665-a45e-102432e06315 /media/thanh/ssd      ext4    defaults        0       0</code></pre>
            </div>
          <h6>Test the fstab file</h6>
            <div style="width:650px;overflow:auto">
<pre><code>findmnt --verify</code></pre>
            </div>
        </td>
    </tr>
    <!-- Row 2 -->
    <tr>
        <td >
        <h6>Replace sub string</h6>
        </td>
        <td>
            <div style="width:650px;overflow:auto">
<pre><code>a="\"$1\""
sed -i -e "s/\(ssid=\).*/\1$a/" /etc/wpa_supplicant/wpa_supplicant.conf</code></pre>
            </div>
        </td>
    </tr>
    <!-- Row 3 -->
     <tr>
        <td >
        <h6>Virtual Display</h6>
        </td>
        <td>
          <h6>Create /etc/X11/xorg.conf.d/20-intel.conf</h6>
            <div style="width:650px;overflow:auto">
<pre><code>Section "Device"
    Identifier "intelgpu0"
    Driver "intel"
    Option "VirtualHeads" "1"
EndSection</code></pre>
            </div>
          <h6>Generate modeline with or cvt </code> </h6>
            <div style="width:650px;overflow:auto">
<pre><code>cvt 1920 1080
xrandr --newmode "1920x1080_60.00"  173.00  1920 2048 2248 2576  1080 1083 1088 1120 -hsync +vsync
xrandr --addmode VIRTUAL1 1920x1080_60.00</code></pre>
            </div>
          <h6>Activate virtual display: (Replace HDMI1 with your real display)</h6>
            <div style="width:650px;overflow:auto">
<pre><code>xrandr --output VIRTUAL1 --mode 1920x1080_60.00 --right-of HDMI1</code></pre>
            </div>
        </td>
    </tr>
    <!-- Row 4 -->
     <tr>
        <td >
        <h6>Edit pushed commits</h6>
        </td>
        <td>
            <div style="width:650px;overflow:auto">
<pre><code>git rebase -i HEAD~N # N là số commit muốn chỉnh sữa tính từ commit gần đây nhât. </code></pre>
            </div>
          <h6>Edit commit</h6>
            <div style="width:650px;overflow:auto">
<pre><code># p, pick = use commit
# r, reword = use commit, but edit the commit message
# e, edit = use commit, but stop for amending
# s, squash = use commit, but meld into previous commit
# f, fixup = like "squash", but discard this commit's log message
# x, exec = run command (the rest of the line) using shell
</code></pre>
            </div>
            <h6>Force push update</h6>
            <div style="width:650px;overflow:auto">
<pre><code>git push --force</code></pre>
            </div>
        </td>
    </tr>
     <!-- Row 5 -->
    <tr>
        <td >
        <h6>Calculation</h6>
        </td>
        <td>
            <div style="width:650px;overflow:auto">
<pre><code>val=$(expr "$val" + 256)
</code></pre>
            </div>
        </td>
    </tr>
  </tbody>
</table>

