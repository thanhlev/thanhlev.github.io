---
layout: default
title: "[🔥] - Lịch sử của Linux Wi-Fi Driver"
short_description: "Thiết kế của Wi-Fi driver trên Linux"
status: "Done"
picture: "assets/images/intel_wifi_module.png"
commit1: Cập nhật Control Path
latest_release: "Cập nhật Control path ngày nay và  Flow hoạt động của driver đời mới"
index: 2
publish: true
---

# Linux Wi-Fi Driver có gì đặc biệt?
{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------
## Revision history

| Revision | Date          | Remark      |
|:---------|:------------- |:------------|
| 0.1      | Jan-12-2023   | {{page.commit1}} |
| 0.2      | Jan-16-2023   | {{page.latest_release}}|

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

Để tăng tính thuyết phục nó là một net device thông thường, mình set thêm địa chỉ IP cho nó.

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

Ở đường dữ liệu ngược lại, application từ user space thông qua socket chuyển dữ liệu đến net core, sau khi đi qua một loại các routing rule, filter rules, chèn header ở mỗi layer của TCP/IP stack, gói tin được Kernel (net-core) chuyển đến interface thông qua callback `ndo_start_xmit()` Đây là các API của driver, được đăng ký với Kernel ở giai đoạn đăng ký interface thông qua struct

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

Bể khổ bắt đầu từ đây, thế là Wi-Fi driver phải nghĩ ra cách để tạo được Link connection đến thiết bị khác.
Thời Wi-Fi “tiền sử“, không có tiêu chuẩn gì cả (chưa có khái niệm STA, AP, WPA ...), driver làm gì cũng được miễn là tạo được link connection với một thiết bị khác, vậy nên mỗi hãng tự viết các tiêu chuẩn riêng

Để tạo được kết nối, Wi-Fi driver tạo ra một đường giao tiếp giữa module Wi-Fi và người dùng, và đường giao tiếp này gọi là Control Path dùng để cấu hình cho thiết bị và lấy thông tin từ thiết bị.

## Control path

Để 2 module kết nối với nhau cả hai cần những thiết lập như Channel, SSID/Password (này mình lấy cho dễ hiễu,  SSID mới xuất hiện sau này thôi.)

### Control path thời kì đồ đá

Như tiêu đề, giai đoạn này mỗi hãng tự viết tiêu chuẩn riêng để cấu hình cho module Wi-Fi của mình. Một ví dụ điển hình là các USB hoặc module 3/4/5G hiện nay.

- Một đường truyền tốc độ cao để làm Data Path (USB/PCI)
- Một đường truyền tốc độ chậm để làm Control Path (UART/I2C)

Các hãng sẽ viết các phần mềm để giao tiếp với thiết bị qua control path, các module đời cũ thì dùng qua tập lệnh AT, cao cấp hơn thì qua web socket ...

### Control path thời kì đồ sắt

Nhận thấy sự phân mãnh của các driver cũng như phần mềm cấu hình cho module Wi-Fi, năm 1996 ông [Jean Tourrilhes](https://www.hpl.hp.com/personal/Jean_Tourrilhes/) giới thiệu bộ công cụ [Wireless Extensions for Linux](https://www.hpl.hp.com/personal/Jean_Tourrilhes/Linux/Tools.html), bộ công cụ này gồm ba phần:

- Phần 1: Ứng dụng để giao tiếp giữa user và extension
- Phần 2: Modify ở Kernel để tạo đường giao tiếp giữa kernel và driver
- Phần 3: Modify firmware trên Wi-Fi module để  hiểu được extension

Khó khăn nhất là ở phần 3 vì các hãng luôn muốn độc quyền sản phẩm của mình hơn là đi theo tiêu chuẩn. Đầu tiên thì cần phải có vài hãng tiên phong, sau đó nếu doanh thu bị ảnh hưởng thì các hãng lớn buộc phải hỗ trợ.

#### Giao tiếp giữa user và extension
##### /proc/net/wireless
- Để lấy thông tin về tình trạng hoạt động của Wi-Fi module, [Jean Tourrilhes](https://www.hpl.hp.com/personal/Jean_Tourrilhes/) đã tạo một nhân bản từ file `/proc/net/dev`, nó là `/proc/net/wireless`, file này chỉ chứa các thông tin liên quan đến Wi-Fi Link mà device ethernet tiêu chuẩn không có.



- Như đã đề cập, Wi-Fi driver là một network driver cho nên interface mà nó tạo ra có đầy đủ thuộc tính của một net device.

```shell
 cat /proc/net/dev
Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
    lo: 5390764   56790    0    0    0     0          0         0  5390764   56790    0    0    0     0       0          0
  eth0:       0       0    0    0    0     0          0         0        0       0    0    0    0     0       0          0
 wlan0:  169874  716173    0   59    0     0          0         0    14152    1103    0    0    0     0       0          0
 wlan1:    1610      10    0    0    0     0          0         0    13537      95    0    1    0     0       0          0
 wlan2:       0       0    0    0    0     0          0         0        0       0    0    0    0     0       0          0
 wlan3:   16106     207    0    0    0     0          0         0     1722      11    0    0    0     0       0          0
 wlan4:       0       0    0    0    0     0          0         0        0       0    0    0    0     0       0          0
docker0:      0       0    0    0    0     0          0         0        0       0    0    0    0     0       0          0
```



##### iwconfig

- Đây là công cụ được clone ra từ công cụ `ifconfig` nổi tiếng toàn cầu (rất tiếc sắp bị đàn em là công cụ `ip` thay thế ). `iwconfig` gửi các thông tin cấu hình thiết đến Kernel như: Channel muốn hoạt động, network ID, tên của protocol muốn dùng, kiểu mã hóa, và vô vàn các thông số khác nữa.

- Vì `Wireless Extension` chưa từng có trước đó nên [Jean Tourrilhes](https://www.hpl.hp.com/personal/Jean_Tourrilhes/) phải patch Kernel để  nó hiểu được các thông tin phụ này cho wireless interface. Sau đó Kernel cũng đã merge luôn patch này để làm tính năng mặc định của Kernel luôn.

- `iwconfig` hỗ  trợ những lệnh sau

```shell
thanh@dell ~
└──▶ iwconfig  --help
Usage: iwconfig [interface]
                interface essid {NNN|any|on|off}
                interface mode {managed|ad-hoc|master|...}
                interface freq N.NNN[k|M|G]
                interface channel N
                interface bit {N[k|M|G]|auto|fixed}
                interface rate {N[k|M|G]|auto|fixed}
                interface enc {NNNN-NNNN|off}
                interface key {NNNN-NNNN|off}
                interface power {period N|timeout N|saving N|off}
                interface nickname NNN
                interface nwid {NN|on|off}
                interface ap {N|off|auto}
                interface txpower {NmW|NdBm|off|auto}
                interface sens N
                interface retry {limit N|lifetime N}
                interface rts {N|auto|fixed|off}
                interface frag {N|auto|fixed|off}
                interface modulation {11g|11a|CCK|OFDMg|...}
                interface commit
       Check man pages for more details.
```
- Lấy thông tin

```shell
└──▶ iwconfig wlan0
wlan0     IEEE 802.11  ESSID:"home_ssid"
          Mode:Managed  Frequency:5.18 GHz  Access Point: xx:xx:xx:xx:xx:xx
          Bit Rate=866.7 Mb/s   Tx-Power=22 dBm
          Retry short limit:7   RTS thr:off   Fragment thr:off
          Power Management:on
          Link Quality=54/70  Signal level=-56 dBm
          Rx invalid nwid:0  Rx invalid crypt:0  Rx invalid frag:0
          Tx excessive retries:0  Invalid misc:597   Missed beacon:0
```
- Ngày nay (2023) thì lệnh `iwconfig` vẫn còn được dùng, tuy nhiên nó là "Bình cũ, rượu mới" rồi, dùng để chiều lòng các anh em hoài cổ thôi, phần giao tiếp bên dưới
đã được thay đổi bằng siêu anh hùng `nl80211` rồi.

> <span style="color:blue">Linux quản lý network stack bằng cách dùng một cấu trúc (device structure) để  kiểm soát mỗi net device trong hệ thống. Phần đầu tiên của structure này là tiêu chuẩn và chứa các thông số như địa chỉ base I/O của thiết bị, địa chỉ IP..., các callback (start device, gửi-nhận packets...)</span>

[Jean Tourrilhes](https://www.hpl.hp.com/personal/Jean_Tourrilhes/) đã thêm một callback khác `get_wireless_stats` để  lấy các thông số wireless cho file `/proc/net/wireless`. Khi Linux tạo thư muc `/proc`, nó sẽ gọi callback này trên tất cả các net device đang hiện diện trong hệ thống. Nếu một device không đăng ký callback này thì sẽ được bỏ qua (không ảnh hưởng đến hoạt động của các ethernet device)

Khi được gọi, driver có nhiệm vụ giao tiếp với firmware trên Wi-Fi module để lấy thông tin và trả về cho Kernel thông tin thông qua struct `iw_statistics`

```c++
/* ------------------------ WIRELESS STATS ------------------------ */
/*
 * Wireless statistics (used for /proc/net/wireless)
 */
struct iw_statistics {
	__u16		status;		/* Status
					 * - device dependent for now */

	struct iw_quality	qual;		/* Quality of the link
						 * (instant/mean/max) */
	struct iw_discarded	discard;	/* Packet discarded counts */
	struct iw_missed	miss;		/* Packet missed counts */
};
```

Ví dụ trên Ubuntu Desktop 22.04

```shell
cat /proc/net/wireless
Inter- | sta-|   Quality        |   Discarded packets               | Missed | WE
 face  | tus | link level noise |  nwid  crypt   frag  retry   misc | beacon | 22
 wlan0: 0000   76.  -61.   -256.       0      0      0      0      0        0
 wlan1: 0000    0.  -256.  -256.       0      0      0      0      0        0
 wlan2: 0000    0.  -256.  -256.       0      0      0      0      0        0
 wlan3: 0000    1.  -99.   -256.       0      0      0      0      0        0
```

##### iwpriv

Trong khi `iwconfig` yêu cầu các driver cần phải hỗ trợ để làm việc được với nhau thì `iwprive` giúp mỗi hãng có cách để cấu hình riêng cho driver của mình mà có thể không xuất hiện trên các driver của hảng khác hoặc dòng chip khác.

##### ioctl

`ioctl` thông thường được dùng để `user-space` giao tiếp với Kernel thông qua file descriptor, tuy nhiên vẫn có thể áp dụng với network socket. Công cụ `ifconfig` đang sử dụng phương pháp này để giao tiếp với Kernel

Ví dụ để thay đổi địa chỉ IP trên interface eth2, `ifconfig` có thể tạo ra 1 ioctl với các tham số sau:

```
"eth2", SIOCSIFADDR, new address
```

Cấu trúc dữ liệu cho lời gọi trên nằm ở `/usr/include/linux/if.h`. Các option cho các chức năng khác: vlan, routing, arp, bonding, bridge nằm trong file `/usr/include/linux/sockios.h`


```c++
/* Routing table calls. */
/* Socket configuration         controls. */
/* ARP cache control calls. */
/* RARP cache control calls. */
/* Driver configuration calls */
/* DLCI configuration calls */
/* bonding calls */
/* bridge calls */
```

[Jean Tourrilhes](https://www.hpl.hp.com/personal/Jean_Tourrilhes/) đã thêm các IOCTL sau (/usr/include/linux/wireless.h):

```c++
/* -------------------------- IOCTL LIST -------------------------- */

/* Wireless Identification */
/* Basic operations */
/* Informative stuff */
/* Spy support (statistics per MAC address - used for Mobile IP support) */
/* Access Point manipulation */
/* 802.11 specific support */
/* Other parameters useful in 802.11 and some other devices */
/* Encoding stuff (scrambling, hardware security, WEP...) */
/* Power saving stuff (power management, unicast and multicast) */
/* WPA : IEEE 802.11 MLME requests */
/* WPA : Authentication mode parameters */
/* WPA : Extended version of encoding configuration */
/* WPA2 : PMKSA cache management */
```

### Control path ngày nay

Nhu cầu sử dụng Wi-Fi là cực kì lớn, hầu như xuất hiện ở mỗi gia đình, mỗi thiết bị. Kéo theo nó là nhiều công nghệ, nhiều tiêu chuẩn được sinh ra. Điều này cũng tạo ra áp lực cho các nhà phát triển phần mềm, với số lượng tính năng ngày càng nhiều, nhiều doanh nghiệp sử dụng. Họ cần đãm bảo ít lỗi nhất trong các bản release.

Nhìn vào prototype chung của giao tiếp ioctl

```c++
    int ioctl(int fd, unsigned long cmd, ...);
```
Đặc điểm của hàm này làm người review sẽ không biết hàm đó làm gì, không biết rõ có bao nhiêu tham số, kiểu dữ liệu của mỗi tham số. Điều này gây khó khăn cho việc kiểm lỗi quá trình biên dịch và tạo document.

Ngoài ra prototype trên cũng khó hiểu. Các kỹ sư đã cho ra đời 1 thiết kế mới `nl80211`, đọc là netlink 80211


![](/assets/images/nl80211_block_diagram.png)

### nl80211

Đặt ra các tiêu chuẩn để giao tiếp giữa user-space và kernel(thay thế cách dùng ioctl của wireless-extension). Các "khách hàng" nổi tiếng đang sử dụng tiêu chuẩn nl80211 có thể kể tên như: **iw, hostapd, wpa_supplicant, Network Manager, iwd...**
### cfg8021

Thiết kế mới của driver theo chuẩn của nl80211, chứa các API phục vụ cho việc config Linux 802.11, cfg802.11 thay thế các Wireless extension.
<a target="_blank" href="https://elixir.bootlin.com/linux/v6.0/source/include/net/cfg80211.h">cfg80211</a>


### cfg80211_ops

Là các operation struct dùng cho việc giao tiếp giữa protocol cfg80211 và application code. <a target="_blank" href="https://elixir.bootlin.com/linux/v6.0.19/source/include/net/cfg80211.h#L4271">cfg80211_ops</a>


### mac80211


Các module Wi-Fi hiện nay có 2 loại hardware:
* Full-MAC Wi-FI là lớp Media Access Controll (L2) được implement trực tiếp trên firmware của module. Loại này ít tốn tài nguyên của CPU chính và thường thấy trên các Wi-Fi chipset của broadcom
* Soft-MAC, Lớp MAC của hardware loại này được implement trên driver (mac80211), thường thấy trên driver của Intel Wi-Fi chipset

mac80211 là một Kernel module hỗ trợ cho các Wi-Fi module không có khả thực hiện L2 Routing, bất kì dữ liệu gì nó nhận được đều chuyển đến cho driver thực hiện bóc tách, filter ...

mac80211 thực hiện đăng ký nó với cfg80211 thông qua `struct cfg80211_ops`

> <span style="color:blue">Ví dụ về HW driver đăng ký với mac80211: `drivers/net/wireless/iwlwifi/mvm/mac80211.c`</span>

Driver đăng ký sử dụng mac80211 thông qua struct <a target="_blank" href="https://elixir.bootlin.com/linux/v6.0.19/source/include/net/mac80211.h#L4117">ieee80211_ops</a>

## Flow hoạt động của driver đời mới

|Bước     | Giải thích|
|:---------|:----------|
|1. Probing the HW|Kiểm tra xem Thiết bị Wi-Fi sử dụng hardware nào để chọn driver phù hợp, phổ biến USB và PCI|
|2. Khởi tạo mac80211| Sau khi chọn được driver, driver gọi hàm `ieee80211_allow_hw()` để đăng ký mac80211 với cfg80211|
|3. Khởi tạo wiphy| Driver gọi hàm `cfg80211_wiphy_new()` để đăng ký một physical device cho Wi-Fi|

Với tiêu chuẩn nl80211 mới này, các thông tin, mode hỗ trợ, băng tần ... driver cần phải hỗ trợ để cung cấp thông tin đầy đủ để user-space application thực hiện cấu hình.

Ví dụ:

```shell
thanhle@thanhle ~
└──▶ iw phy0 info
Wiphy phy0
        ...
        Supported interface modes:
                 * IBSS
                 * managed
                 * AP
                 * AP/VLAN
                 * monitor
                 * P2P-client
                 * P2P-GO
                 * P2P-device
        ...
        Supported commands:
                 * new_interface
                 * set_interface
                 * new_key
                 * start_ap
                 * new_station
                 * new_mpath
                 * set_mesh_config
                 * set_bss
                 * authenticate
                 * associate
                 * deauthenticate
                 * disassociate
                 * join_ibss
                 * join_mesh
                 * remain_on_channel
                 * set_tx_bitrate_mask
                 * frame
                 * frame_wait_cancel
                 * set_wiphy_netns
                 * set_channel
                 * start_sched_scan
                 * probe_client
                 * set_noack_map
                 * register_beacons
                 * start_p2p_device
                 * set_mcast_rate
                 * connect
                 * disconnect
                 * channel_switch
                 * set_qos_map
                 * add_tx_ts
                 * set_multicast_to_unicast
       ...
        valid interface combinations:
                 * #{ managed } <= 1, #{ AP, P2P-client, P2P-GO } <= 1, #{ P2P-device } <= 1,
                   total <= 3, #channels <= 2
        HT Capability overrides:
                 * MCS: ff ff ff ff ff ff ff ff ff ff
                 * maximum A-MSDU length
                 * supported channel width
                 * short GI for 40 MHz
                 * max A-MPDU length exponent
                 * min MPDU start spacing
```
