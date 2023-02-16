---
layout: default
title: "Linux Network Management"
short_description: "Các loại hình quản lý network trên Linux"
picture: "assets/images/linux_network_management.png"
status: "Done"
index: 1
---

# Linux Network Management
{: .no_toc }
## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------
## Ifupdown
- Sau khi driver đăng ký thành công net interface với kernel, công cụ ifupdown thực hiện bring up và cấu hình interface.
- ifupdown thực hiện đọc thông tin cấu hình ở file `/etc/network/interfaces`.
- Các phản phân phối Ubuntu hiện nay không còn dùng mô hình này nữa.
- Ví dụ

```python
# static IP
iface eth0 inet static
    address 192.168.0.111
    netmask 255.255.255.0
    gateway 192.168.0.1

```
```python
# DHCP IP
iface eth0 inet dhcp

```

```python
# Wi-Fi interface
iface wlan0 inet dhcp
    wireless-essid myessid
    wireless-key 123456789e
```
- Đổi với các wireless interface hoặc virtual interface, trước khi cấú hình layer 3 thông qua DHCP hay static address, cần tạo link connection cho layer 2. ifupdown cung cấp cơ chế hook để user tạo link connection.
- Các hook cho ifupdown trước khi bring up được đặt ở: `/etc/network/if-pre-up.d`

```python
# ls /etc/network/if-pre-up.d
bridge : Cấu hình các cho software bridge interface
wireless-tools: Cấu hình wireless interface sử dụng iwconfig tool
wpasupplicant : Cấu hình Wi-Fi interface ở mode station
```
- Thông thêm về  hoạt động của Wi-Fi interface và virtual interface xem ở đây [Linux Wi-Fi Driver](linux_wifi_driver.html) và [Linux Virtual Interface](virtual_interface.html)
- Reference: [https://cumulusnetworks.github.io/ifupdown2/ifupdown2/userguide.html](https://cumulusnetworks.github.io/ifupdown2/ifupdown2/userguide.html)

## Network Manager

- [Network Manager](https://help.ubuntu.com/community/NetworkManager?action=show&redirect=WifiDocs%2FNetworkManager) là công cụ quản lý network mặc định cho các bản phát hành Ubuntu desktop là server từ ubuntu 15.04 đến 20.04
- Hỗ trợ các loại kết nối: ethernet, wireless, Mobile broadband, VPN, DSL
- Reference [Network Manager](https://help.ubuntu.com/community/NetworkManager?action=show&redirect=WifiDocs%2FNetworkManager)
## Systemd-networkd

## Netplan

## Netifd

