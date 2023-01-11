---
layout: default
title: "Linux Wi-Fi Driver có gì đặc biệt?"
short_description: "(Thiết kế của Wi-Fi driver trên Linux)"
status: "InProgress"
picture: "assets/images/intel_wifi_module.png"
latest_release: "Viết tới Control Path thời kì đồ đá"
videos: []
---

# Linux Wi-Fi Driver có gì đặc biệt?

{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------
## Giới thiệu

Wi-Fi driver là một network driver, nhiệm vụ đầu tiên nó cần làm là đăng ký  với Kernel để tạo ra net device

Net device này tương tự như ethernet interface mà Kernel đã hỗ trợ từ lâu. Sau khi khởi tạo thành công thì interface được tạo ra hoạt động giống hệt như một ethernet interface, kernel  đối xử với nó như một ethernet interface. Bằng chứng là lệnh `ifconfig` show ra chúng không có gì khác nhau ngoài cái tên


```shell
eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.100  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::3e7c:3fff:fe28:a7d1  prefixlen 64  scopeid 0x20<link>
        ether 3c:7c:3f:28:a7:d1  txqueuelen 1000  (Ethernet)
        RX packets 5095768  bytes 5407146907 (5.4 GB)
        RX errors 0  dropped 1  overruns 0  frame 0
        TX packets 2931637  bytes 1322759143 (1.3 GB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
        device interrupt 16  memory 0xa1100000-a1120000

wlan0: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500
        ether ac:12:03:d9:ca:e7  txqueuelen 1000  (Ethernet)
        RX packets 199840  bytes 19071504 (19.0 MB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 33979  bytes 3645765 (3.6 MB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

Và tên này thì chúng ta cũng có thể đổi được, không những đổi được tên mà con tên tiếng Việt nữa cơ

```shell
sudo ifconfig wlan0 down
sudo ip set name "cu-tèo" dev wlan0
sudo ifconfig "cu-tèo" up
```

Kết quả nó như thế này

```shell
└──▶ ifconfig
cu-tèo: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500
        ether ac:12:03:d9:ca:e7  txqueuelen 1000  (Ethernet)
        RX packets 199840  bytes 19071504 (19.0 MB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 33979  bytes 3645765 (3.6 MB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

```

Để tăng tính thuyết phục nó là một net device thông thương, mình set thêm địa chỉ IP cho nó.

```shell
sudo ifconfig set "cu-tèo" 20.10.20.10 netmask 255.255.255.0
```

Xem kết quả nào

```shell
thanh@pc ~
└──▶ ifconfig
cu-tèo: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500
        inet 20.10.20.10  netmask 255.255.255.0  broadcast 20.10.20.255
        ether ac:12:03:d9:ca:e7  txqueuelen 1000  (Ethernet)
        RX packets 199840  bytes 19071504 (19.0 MB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 33979  bytes 3645765 (3.6 MB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```
Tiếp theo ta sẽ tìm hiểu xem cách thức truyền nhận dữ liệu của nó như thế nào.

## Data path

Kernel sẽ cho driver đăng ký callback để khi  có data đến interface hoặc kernel muốn gửi data đến interface thì thông qua callback này. Đường giao tiếp này được gọi là Data path.

Khi Wi-Fi module nhận được dữ liệu từ không gian, nó sẽ thông qua hàm `netif_rx()` để chuyển dữ liệu này đến netdev core. Và từ đây net core sẽ chuyển nó đến TCP/IP stack để phân phối đến các application ở user space thông qua các socket.

Ở đường dữ liệu ngươc lại, application từ user space thông qua socket chuyển dữ liệu đến net core, sau khi đi qua một loại các routing rule, filter rules, chèn header ở mỗi layyer của TCP/IP stack, gói tin được Kernel (net-core) chuyển đến interface thông qua callback `ndo_start_xmit()` Đây là các API của driver, được đăng ký với Kernel ở giai đoạn đăng ký interface thông qua struct

```
struct net_device_ops
```
Việc còn lại của driver là chuyển nó đến Wi-Fi module, data này sau đó sẽ được Wi-Fi firmware truyền đi vào không gian.

Nghe có vẽ đơn giản nhỉ, thế nhưng phần còn lại phía sau đây mới làm chúng ta choáng ngợp.

Coi lại cái wireless interface xem nào:

```shell
thanh@pc ~
└──▶ ifconfig
cu-tèo: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500
        inet 20.10.20.10  netmask 255.255.255.0  broadcast 20.10.20.255
        ether ac:12:03:d9:ca:e7  txqueuelen 1000  (Ethernet)
        RX packets 199840  bytes 19071504 (19.0 MB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 33979  bytes 3645765 (3.6 MB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```
Cài đặt Layer 3 sẵn sàng rồi, kiểm tra Layer 2 xem đã có Link connection chưa nào.

```shell
ip link l

2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP ....
3: cu-tèo: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN ...
```
`state DOWN ...` Thôi toang, quên mất nếu là ethernet thì cắm sợi dây vô switch hoặc router đang hoạt động thì có kết nối ngay (link connection), còn cái “cu-tèo” interface kia thì làm sao?

Bể khổ bắt đầu từ đây, thế là Wi-Fi driver phải nghĩ ra cách để tạo được Link connection đến thiết khác.
Thời Wi-Fi “tiền sử“, không có tiêu chuẩn gì cả (chưa có khái niệm STA, AP, WPA ...), driver làm gì cũng được miễn là tạo được link connection với một thiết bị khác, vậy nên mỗi tự viết các tiêu chuẩn riêng

Để tạo được kết nôi, Wi-Fi driver tạo ra một đường giao tiếp giữa module Wi-Fi và người dùng, và đường giao tiếp này gọi là Control Path.

## Control path

Để 2 module kết nối với nhau cả hai cần những thiết lập như Channel, SSID/Password (này mình lấy cho dễ hiễu,  SSID mới xuất hiện sau này thôi.)

### Control path thời kì đồ đá

Như tiêu đề, giai đoạn này mỗi hãng tự viết tiêu chuẩn riêng để cấu hình cho module Wi-Fi của mình. Một ví dụ điển hình là các USB hoặc module 3/4/5G hiện nay.

- Một đường truyền tốc độ cao để làm Data Path (USB/PCI)
- Một đường truyền tốc độ chậm để làm Control Path (UART/SPI)


### Control path thời kì đồ sắt (to be continued)

### Control path thời kì văn minh (to be continued)
