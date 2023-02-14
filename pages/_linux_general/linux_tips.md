---
layout: default
title: "Linux Tips"
short_description: "Các task hay dùng với Linux"
status: "In Progress"
picture: "assets/images/linux_tips.jpg"
latest_release: "Init document"
videos: []
---

# Linux tips
{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------

## Revision history

| Revision | Date          | Remark      |
|:---------|:------------- |:------------|
| 0.1      | Feb-11-2023   | {{page.latest_release}} |



<table>
  <thead>
    <tr>
      <th>Items</th>
      <th>Details</th>
    </tr>
  </thead>

<tbody>
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
  </tbody>
</table>

