---
layout: default
title: "Docker Snippet"
short_description: "Các lệnh Docker thường dùng"
status: "In Progress"
picture: "assets/images/docker-banner.png"
latest_release: "Init document"
videos: []
---

# Docker Snippet
{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------

## Revision history

| Revision | Date          | Remark      |
|:---------|:------------- |:------------|
| 0.1      | Feb-06-2023   | {{page.latest_release}} |

## Các lệnh thường dùng với Docker

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
        <h6>Thay đổi nơi lưu<br>docker images mặc định</h6>
        </td>
        <td>
          <h6>Tạo file <code>/etc/docker/daemon.json</code></h6>
            <div style="width:450px;overflow:auto">
<pre><code>{"data-root": "/mnt/newlocation"}</code></pre>
            </div>
          <h6>Restart docker daemon</h6>
            <div style="width:450px;overflow:auto">
<pre><code>systemctl restart docker</code></pre>
            </div>
          <p>- Các container mới tạo sẽ được lưu vào vị trí mới, các container cũ vẫn được lưu ở: <code>/var/lib/docker</code></p>
        </td>
    </tr>
  </tbody>
</table>

