---
layout: default
title: "Udev Quick Reference"
short_description: "Udev Quick Reference"
status: "Done"
picture: "assets/images/udev_Kernel.JPG"
latest_release: "Init document"
index: 4
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
| 0.1      | Feb-14-2023   | {{page.latest_release}} |


## Thông tin

- Trong OS system sử dụng udev, việc quản lý các event liên quan đến các thiết bị hoạt động ở kernel được thực hiện bởi udev thông qua daemon `udevd`.
- `udevd` chạy như một daemon ở user space, mở kết nối đến Kernel và nhận các system event từ kernel.
- Dựa trên các rule được thiết lập, `edevd` thực hiện các hành động tương ứng với các sự kiện, ví dụ :
    - Đổi tên 1 thiết bị
    - Cung cấp tên gợi nhớ bằng symlink
    - Đặt tên thiết bi dựa trên output của một program
    - Đổi permission
    - Chạy script khi device thêm hoặc xóa.
    - đổi tên network interface.


## How rules are organized

Rule cho udevd được cấu hình thông qua các file `*.rules`. Có 2 nơi chính lưu trữ các rule này:

- `/usr/lib/udev/rules.d` : lưu các rule được tạo bởi system.
- `/etc/udev/rules.d/` : cho các rule custom.

Các rule được đặt tên với prefix là số, giúp user cài đặt luôn thứ tự áp dụng.

Ngoài ra, nếu có 2 file có tên giống nhau được đặt ở `/usr/lib/udev/rules.d` và ở `/etc/udev/rules.d/` thì file ở `/etc/udev/rules.d/` sẽ overide file cài đặt bởi system

## Ví dụ

### Tự động tắt touch pad khi có chuột gắn vào

```python
ACTION=="add" \
, ATTRS{idProduct}=="c52f" \
, ATTRS{idVendor}=="046d" \
, ENV{DISPLAY}=":0" \
, ENV{XAUTHORITY}="/run/user/1000/gdm/Xauthority" \
, RUN+="/usr/bin/xinput --disable 16"
```

- Toán tử sử dụng cho action:
    - `= :` : Gán giá trị cho key mà chỉ chấp nhận 1 giá trị

    - `:=` :  Gán giá trị và không thể thay đổi bằng các rule khác.

    - `+= , -=` :  thêm hoặc giá trá trị của key có chứa giá trị dạng list.

- The keys we used
    - `ACTION` :  add/remove/change:  loại hành động muốn thực hiện
    - `ATTRS` : Khai báo các attribute muốn match

- Hoạt động: Khi một thiết bị có product ID `c52f` và vender ID `046d` cắm vào máy tính, lệnh `/usr/bin/xinput --disable 16` sẽ được gọi để disable touch pad.

## The rules syntax

Các rule được thiết kế có 2 phần:
- `match`  : điều kiện để rule được kích hoạt, có thể áp dụng nhiều điều kiện, và ngăn cách nhau bởi dấu phẩy.
- `action` : hành động muốn thực hiện khi rule match event




### Rule match

- `udevd` dùng các attribute để kiểm tra rule nào thõa điều kiện, trong ví dụ ở trên , product ID và vendor ID được dùng để  kiểm tra.

- Có thể list ra các atttribute mà một device cung cấp thông qua  lệnh `udevadm info`, theo sau là tên hoặc sysfs (file system đại diện cho device). Thông tin về device xem ở `sys/devices`
    - Ví dụ:

```python
udevadm info -ap /devices/pci0000:00/0000:00:14.0/usb1/1-11/1-11:1.0/input/input15
udevadm info /sys/class/net/wlan0 --attribute-walk
```

-  Ngoài việc dùng biến `ATTRS` để khớp thuộc tính của thiết bị, có thể dùng biến `ENV` để khớp thêm biến môi
trường.
    - `ENV{DISPLAY}=":0"` : khi có display chính, remote session sẽ không có biến này.
- Các KEY dùng cho matching

| KEY | Description          |
|:---------|:------------- |
|ACTION      | (add/remove/change): Match the name of the event action.  |
|DEVPATH      | Match the devpath of the event device  |
|KERNEL      | Match the name of the event device, KERNEL=="fb0", KERNEL=="card0" |
|KERNELS      | Search the devpath upwards for a matching device name. |
|NAME      | Match the name of a network interface. It can be used once the NAME key has been set in one of the preceding rules.. |
|SYMLINK      | Match the name of a symlink targeting the node. It can be used once a SYMLINK key has been set in one of the preceding ules. There may be multiple symlinks; only one needs to match|
|SUBSYSTEM      | Match the subsystem of the event device SUBSYSTEM=="graphics", SUBSYSTEM=="drm" |
|SUBSYSTEMS      | Search the devpath upwards for a matching device subsystem name |
|DRIVER      | Match the driver name of the event device. Only set this key for devices which are bound to a driver at the time the event  is generated |
|ATTR{filename}      | Match sysfs attribute value of the event device. Trailing whitespace in the attribute values is ignored unless the specified match value itself contains trailing whitespace|
|ATTRS{filename}      | Search the devpath upwards for a device with matching sysfs attribute values. If multiple ATTRS matches are specified,  all of them must match on the same device. |
|SYSCTL{kernel parameter}       | Match a kernel parameter value. |
|ENV{key}:   | biến môi trường (ENV{SYSTEMD_WANTS}+="display_mywebapp@root.service) |
|CONST{key}:   | biến môi trường (ENV{SYSTEMD_WANTS}+="display_mywebapp@root.service) |
|TAG:   | Match dựa trên TAG , vd `device tag TAG+="systemd"` |
|TAGS:   | Search the devpath upwards for a device with matching tag. |

### Rule Action

- Khi kiểm tra rule đã thõa điều, kiện, nội dung định nghĩa bởi biến `RUN` sẽ được thực thi.

<div class="info">
  <p><strong>Info!</strong> Các RUN sẽ không được thực thi ngay mà chờ quá trình kiểm tra tất cả rule hoàn tất</p>
</div>

- Có thể test một rule. (phần action sẽ không được chạy)

```python
 udevadm test --action="add" \
  /devices/pci0000:00/0000:00:1d.0/usb2/2-1/2-1.2/2-1.2:1.1/0003:046D:C52F.0010/input/input39
```

- Cấp nhật rule vừa tạo mới: `udevadm control --reload`
