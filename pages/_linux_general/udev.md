---
layout: default
title: "Udev Quick Reference"
short_description: "Ghi chép udev của mình: rule nằm đâu, thứ tự, ví dụ tắt touchpad khi cắm chuột, udevadm test"
status: "Done"
picture: "assets/images/udev_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: rewritten as a STAR story"
index: 4
publish: true
tags: [linux, testing]
---

# Udev Quick Reference
{: .no_toc }

![Udev trong một hình]({{ '/assets/images/udev_cover.jpg' | relative_url }})
*Ba bước từ kernel tới module, và một rule tắt touchpad khi cắm receiver chuột.*

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------

## Situation

Chuyện bắt đầu nhỏ thôi: mình muốn laptop tự tắt touchpad khi cắm receiver của con chuột Logitech vào. Việc kiểu "thiết bị cắm vào thì chạy lệnh gì đó" trên Linux là việc của udev, mà mình thì chưa viết rule udev nào cho ra hồn, cũng không nhớ rule nằm ở đâu hay chạy theo thứ tự nào.

## Task

Viết một rule: receiver `046d:c52f` cắm vào thì gọi `xinput --disable` cho touchpad. Tiện thể ghi lại cho mình mấy thứ hay quên: rule đặt ở thư mục nào, tên file quyết định thứ tự ra sao, tìm attribute của thiết bị bằng gì, và test rule mà không phải rút ra cắm vào cả chục lần.

## Action

### udevd làm gì

Kernel phát event mỗi khi có thiết bị thêm, bớt hay đổi trạng thái. `udevd` là daemon ở user space, mở kết nối tới kernel, nhận các event đó và so với các rule. Rule nào khớp thì nó làm theo: đổi tên thiết bị, tạo symlink dễ nhớ, đặt tên theo output của một chương trình, đổi permission, chạy script khi cắm/rút, đổi tên network interface.

### Rule nằm ở đâu

Rule là các file `*.rules`, ở hai chỗ chính:

- `/usr/lib/udev/rules.d`: rule của hệ thống (package cài vào).
- `/etc/udev/rules.d/`: rule tự viết.

Tên file có prefix là số, và udev đọc theo thứ tự tên, nên số đó chính là thứ tự áp dụng. Nếu hai thư mục có file trùng tên thì file trong `/etc/udev/rules.d/` thắng, file của hệ thống bị bỏ qua. Muốn tắt hẳn một rule của hệ thống thì cứ tạo file cùng tên trong `/etc`.

### Rule tắt touchpad

```
ACTION=="add" \
, ATTRS{idProduct}=="c52f" \
, ATTRS{idVendor}=="046d" \
, ENV{DISPLAY}=":0" \
, ENV{XAUTHORITY}="/run/user/1000/gdm/Xauthority" \
, RUN+="/usr/bin/xinput --disable 16"
```

Khi một thiết bị có vendor ID `046d` và product ID `c52f` được cắm vào, udev gọi `/usr/bin/xinput --disable 16`, với 16 là id của touchpad trong `xinput list` trên máy mình lúc đó.

Ba dòng đầu là phần match (dùng `==`). Hai dòng `ENV{...}=` dùng dấu `=` đơn, tức là gán chứ không phải so: chúng đặt `DISPLAY` và `XAUTHORITY` cho lệnh trong `RUN`, vì lệnh đó chạy từ udevd chứ không từ session X của mình, không có hai biến này thì `xinput` không biết nói chuyện với X server nào.

Các toán tử:

- `==`, `!=`: so khớp (phần match).
- `=`: gán giá trị cho key chỉ nhận một giá trị.
- `:=`: gán và khoá lại, rule sau không đổi được nữa.
- `+=`, `-=`: thêm vào hoặc bớt khỏi key dạng list (như `RUN`).

### Cú pháp: match và action

Mỗi rule có hai phần. Phần match là các điều kiện, cách nhau bởi dấu phẩy, tất cả phải đúng thì rule mới chạy. Phần action là việc cần làm khi khớp. Trong ví dụ trên, `ACTION` chọn loại event (`add`/`remove`/`change`), `ATTRS` khớp attribute của thiết bị.

Các key dùng để match (theo `man udev`):

| KEY | Description |
|:---------|:------------- |
|ACTION | (add/remove/change): Match the name of the event action. |
|DEVPATH | Match the devpath of the event device |
|KERNEL | Match the name of the event device, KERNEL=="fb0", KERNEL=="card0" |
|KERNELS | Search the devpath upwards for a matching device name. |
|NAME | Match the name of a network interface. It can be used once the NAME key has been set in one of the preceding rules. |
|SYMLINK | Match the name of a symlink targeting the node. It can be used once a SYMLINK key has been set in one of the preceding rules. There may be multiple symlinks; only one needs to match |
|SUBSYSTEM | Match the subsystem of the event device SUBSYSTEM=="graphics", SUBSYSTEM=="drm" |
|SUBSYSTEMS | Search the devpath upwards for a matching device subsystem name |
|DRIVER | Match the driver name of the event device. Only set this key for devices which are bound to a driver at the time the event is generated |
|ATTR{filename} | Match sysfs attribute value of the event device. Trailing whitespace in the attribute values is ignored unless the specified match value itself contains trailing whitespace|
|ATTRS{filename} | Search the devpath upwards for a device with matching sysfs attribute values. If multiple ATTRS matches are specified, all of them must match on the same device. |
|SYSCTL{kernel parameter} | Match a kernel parameter value. |
|ENV{key} | Match (với `==`) hoặc đặt (với `=`) một biến môi trường, vd `ENV{SYSTEMD_WANTS}+="display_mywebapp@root.service"` |
|CONST{key} | Match a system-wide constant, vd `CONST{arch}`, `CONST{virt}` |
|TAG | Match theo tag của thiết bị, vd tag `TAG+="systemd"` |
|TAGS | Search the devpath upwards for a device with matching tag. |

### Tìm attribute bằng udevadm info

Product ID và vendor ID ở trên mình lấy từ `udevadm info`, đưa nó đường dẫn sysfs của thiết bị (dưới `/sys/devices`) hoặc một class device:

```bash
udevadm info -ap /devices/pci0000:00/0000:00:14.0/usb1/1-11/1-11:1.0/input/input15
udevadm info /sys/class/net/wlan0 --attribute-walk
```

`--attribute-walk` in attribute của thiết bị và của từng thiết bị cha khi đi ngược lên devpath. `ATTRS` cũng tìm ngược lên như vậy, nên `idVendor` nằm ở thiết bị USB cha vẫn khớp được từ event của input con. Chỉ có điều mọi `ATTRS` trong một rule phải khớp trên cùng một thiết bị cha.

### Test và nạp lại

`RUN` không chạy ngay khi gặp: udevd xét hết các rule cho event đó rồi mới chạy danh sách `RUN`.

Test một rule mà không cần cắm rút (phần `RUN` không được chạy, chỉ in ra là nó sẽ chạy gì):

```bash
 udevadm test --action="add" \
  /devices/pci0000:00/0000:00:1d.0/usb2/2-1/2-1.2/2-1.2:1.1/0003:046D:C52F.0010/input/input39
```

Sửa hay thêm rule xong thì nạp lại: `udevadm control --reload`.

## Result

Rule ở trên nằm trong `/etc/udev/rules.d/`, cắm receiver vào là touchpad tắt. Cái mình hiểu ra sau vụ này: rule là một chuỗi điều kiện `==` cộng một list `RUN`; `=` đơn là gán, kể cả với `ENV`; `/etc` ghi đè `/usr/lib` theo tên file; và `udevadm test` cho xem rule nào khớp mà không phải làm gì với phần cứng.

## What I'd do next

Rule này có hai chỗ yếu mà mình biết. Số 16 là id `xinput` của touchpad lúc mình viết, cắm thêm thiết bị input khác thì id có thể đổi, nên gọi theo tên thiết bị sẽ chắc hơn. Và chỉ có rule `add`: rút chuột ra thì touchpad không tự bật lại, cần thêm một rule `ACTION=="remove"` gọi `xinput --enable`.
