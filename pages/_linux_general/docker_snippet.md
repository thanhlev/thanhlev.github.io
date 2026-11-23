---
layout: default
title: "Docker Snippet"
short_description: "Các lệnh Docker thường dùng"
status: "In Progress"
picture: "assets/images/docker-banner.png"
latest_release: "2026-11-22: rewritten as a STAR story"
index: 5
publish: true
tags: [linux, docker, tools]
---

# Docker Snippet
{: .no_toc }

## Situation

Docker mặc định để mọi thứ (image, container, volume) trong `/var/lib/docker`, tức là nằm trên phân vùng root. Mình cần chuyển chỗ lưu đó sang một ổ khác, mount ở `/mnt/newlocation`. Trang này mở ra để ghi các lệnh Docker kiểu đó, những thứ làm một lần rồi lần sau lại phải đi tìm.

## Task

Đổi thư mục gốc của Docker sang `/mnt/newlocation` mà không phải cài lại gì.

## Action

### Đổi nơi lưu docker images mặc định

Tạo file `/etc/docker/daemon.json`:

```json
{"data-root": "/mnt/newlocation"}
```

Rồi restart daemon để nó đọc lại cấu hình:

```bash
systemctl restart docker
```

## Result

Sau khi restart, container và image tạo mới được lưu vào `/mnt/newlocation`. Những cái tạo từ trước vẫn nằm nguyên ở `/var/lib/docker`: Docker không tự chuyển chúng sang, nó chỉ bắt đầu dùng thư mục mới.

## What I'd do next

Muốn mang cả image cũ theo thì phải dừng Docker và chép nội dung `/var/lib/docker` sang chỗ mới trước khi restart. Mình chưa làm bước đó nên chưa ghi lệnh ở đây. Trang vẫn để "In Progress" vì mới có đúng một mục.
