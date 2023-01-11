---
layout: default
title: "Esp8266 Flash map và Partition Table"
short_description: "Esp8266 Flash map và Partition Table"
status: "Done"
picture: "assets/images/esp8266_block_diagram.png"
latest_release: "Unknown"
videos: []
---

# Giới thiệu

- Đối với production firmware, ta cần quan tâm nhiều đến thiết kế  lưu trữ của bộ nhớ Flash sao cho tối ưu và đáp ứng các yêu cầu của một firmware production như: chứa các dữ liệu của nhà sản xuất, dữ liệu riêng biệt của mỗi MCU (ví dụ WiFi calibration data), dữ liệu người dùng (cần không đổi khi cập nhật firmware), các phân vùng khác nhau để  hỗ trợ cập nhật/backup firmware lúc runtime.
- Bài viết này giới thiệu tổ chức lưu trữ Flash của chip ESP8266EX, đây là dòng Wireless MCU được hỗ trợ khá tốt và sẽ giúp chúng ta có khái niệm cơ bản khi bước sang các dòng MCU, CPU mạnh mẽ và phức tạp hơn.

## ESP8266EX Block Diagram

ESP8266EX là một System On Chip (SoC) của hãng Espressif

![](/assets/images/esp8266_block_diagram.png)

## CPU, Memory, and Flash

### CPU

Bộ vi xử lý Tensilica L106 32-bit kiến trúc RISC được tích hợp bên trong MCU, bộ xử lý này có mức độ tiêu thụ điện cực thấp và đạt tốc độ xung nhịp tối đa 160 MHz

Khi sử dụng RTOS và WiFi stack thì chỉ chiếm 20% CPU resource, còn lại 80% cho chúng ta tự do phát triển ứng dụng.

CPU hỗ trợ các giao tiếp sau:

- Programmable RAM/ROM interfaces (iBus), có thể kết nối đến memory controller và củng có thể dùng để tương tác với flash.
- Data RAM interface (dBus), có thể kết nối đến memory controller.
- AHB interface, dùng để tương tác đến các thanh ghi.

### Memory

SoC ESP8266EX được tích hợp memory controller, static ram (SRAM) và ROM. MCU có thể truy cập SRAM và ROM thông qua iBus, AHB interface và dBus (này là bus phần cứng chứ không phải dBus nổi tiếng trên linux).

Tuy nhiên với SDK hiện tại, static RAM cấp cho user space được cấu hình như sau:

- Khi ESP8266 có chạy WiFi Station mode và kết nối đến AccessPoint thì tổng bộ nhớ tối đa bao gồm Heap và Data cho user là <span style="color:red">xấp xỉ 50 kB</span>, cần lưu ý tối ưu space khi làm app.
- ESP8266 có ROM, nhưng không phải ROM <span style="color:blue">có thể  ghi xóa</span>, cần gắn bộ nhớ ngoài để chứa mã ứng dụng, SoC ESP 8266 hỗ trợ SPI Flash (External flash). <span style="color:red">Các ứng dụng cần bảo mật cao cần lưu ý, hacker có thể đọc/ghi/thay thế chip flask này.</span>

### External flash

Hỗ trợ tối đa 16M theo lý thuyết.
Khi lựa chip flash cho project của mình, cần lưu ý các yêu cầu tối thiểu như sau:

- Nếu firmware không bật tính năng OTA: tối thiểu 512 kB.
- Nếu firmware cần tính năng OTA: tối thiểu 1M

Espressif sử dụng bảng phân vùng (partition tables) để thiết lập thông tin và các vùng lưu trữ các loai dữ liệu khác nhau, chi tiết như sau.

# Partition Tables

## Overview

- Một bộ nhớ flash duy nhất trên ESP8266 có thể chứa nhiều ứng dụng và nhiều loại dữ liệu khác nhau. (calibration data, files systems, parameter storage). Vì lý do này mà một <span style="color:blue">bảng phân vùng (partition tables)</span>. sẽ được ghi vào offset 0x8000 trong bộ nhớ.

- Độ dài của <span style="color:blue">partition table</span> này là 0xC00(3072 bytes) với tối đa 95 phân vùng khác nhau. Và một MD5 checksum sẽ được thêm vào cuối dữ liệu phân vùng.

- Tùy thuộc vào loại ứng dụng sử dụng mà <span style="color:blue">partition table</span> có thể có các entry khác nhau.
- Table bên dưới mô tả một ví dụ một partition table được dùng

| Name     | Type | SubType | Offset   | Size | Flags |
|:---------|:---- |:--------|:---------|:-----|:------|
| nvs      | data | nvs     | 0x9000   | 16K  | none  |
| otadata  | data | ota     | 0xd000   | 8K   | none  |
| phy_init | data | phy     | 0xf000   | 4K   | none  |
| ota_0    | app  | ota_0   | 0x10000  | 960K | none  |
| ota_1    | app  | ota_1   | 0x110000 | 960K | none  |

# Built-in Partition tables

- Khi lựa chọn build một ứng dụng từ build system của Espressif ta sẽ có có 2 lựa chọn để build: OTA và non-OTA, việc lựa chọn tùy chọn này sẽ giúp build system biên dịch luôn bảng phân vùng mặc định tương ứng.
- Dưới đây là khác nhau của partition tables tương ứng 2 trường hợp này.

#### ESP8266 Non-OTA Partition Table

| Name      | Type  | SubType | Offset   | Size    |
|:----------|:----  |:--------|:---------|:--------|
|nvs     | data| nvs    | 0x9000 | 0x6000 |
|phy_init| data| phy    | 0xf000 | 0x1000|
|factory | app | factory| 0x10000| 0xF0000|

- Tại địa chỉ offset 0x10000(64K) được đánh nhãn là factory. Bootloader sẽ chạy mã chương trình tại địa chỉ này theo mặc định.
- Còn lại là các phân vùng chứa data.

#### ESP8266 OTA Partition Table

| Name      | Type  | SubType | Offset   | Size    |
|:----------|:------|:--------|:---------|:--------|
|nvs        |data   | nvs     | 0x9000   | 0x4000  |
|otadata    |data   | ota     | 0xd000   | 0x2000  |
|phy_init   |data   | phy     | 0xf000   | 0x1000  |
|ota_0      |0      | ota_0   | 0x10000  | 0xF0000 |
|ota_1      |0      | ota_1   | 0x110000 | 0xF0000 |

##### Trường Type
- app(0), data(1), là giá trị số từ 0 - 254, hoặc trá trị hex, các loại từ 0x00 đến 0x3F được dự phòng cho ESP8266.
- Nếu ứng dụng cần lưu trữ dữ liệu, type nên dùng từ 0x40 đến 0xFE.
-  Bootloader sẽ bỏ qua các phân vùng không phải là app(0) , data(1).

##### Trường Sub Type

>- Là một giá trị 8 bit để chia nhỏ hơn cho Type. SDK hiện tại chỉ hỗ  trợ cho Type app và type data

###### Các loại subtype của type app(0).

- Khi main type là app(0) thì subtype có thể có các giá trị sau: ota_0 (0x10), ota_1(0x11) …​ ota_14(0x1F).
- ota_0 (0x10): là phân vùng app mặc định, bootloader sẽ chạy code ở phân vùng này đầu tiên. Nếu có các phân vùng OTA khác thì bootloader cần đọc phân vùng otadata để biết cần boot ở đâu. Phân vùng otadata chứa thông tin để bootloader biết phải boot từ phân vùng nào. Nếu otadata trống, bootloader sẽ boot từ ota_0.

- Partition Table mặc định của OTA firmware có 2 địa chỉ cho phân vùng app(0), tại 0x10000 và 0x11000.

###### Các loại subtype của type data.

- Khi main type là data(1) thì subtype có thể có các giá trị sau: ota(0), phy(1), nvs(2).

- subtype ota(0): là OTA Data partition là nơi chứa thông tin phân vùng OTA hiện tại được chọn. Phân vùng này nên có size 0x2000.

- phy(1): Nơi chứa thông tin physical của từng chip khác nhau. Theo cấu hình mặc định, phân vùng này không được sử dụng mà sử dụng thông tin trực tiếp từ firmware, do đó phân vùng này có thể loại bỏ. Để bật chức năng load PHY data từ phân vùng này ta cần bật option `ESP_PHY_INIT_DATA_IN_PARTITION` trong menuconfig, đồng thời cũng cần tự flash thông tin PHY vào phân vùng này thủ công.

- nvs(2): là phân vùng cho các api Non-Volatile Storage. NVS được dùng để chứa các thông tin PHY calibrate cho từng device, nó khác với phy chứa thông tin init. NVS cũng dùng để chứa thông tin WiFi (esp_wifi_set_storage(WIFI_STORAGE_FLASH)). NVS có thể được dùng để lưu trữ thông tin data khác cho ứng dụng. Nên tạo một phân vùng NVS ít nhất 0x3000 byte cho ứng dụng. Nếu ứng dụng cần lưu trữ nhiều data nên sử dụng size 0x6000.

##### Trường Offset và Size.

> <span style="color:red">Phân vùng app phải là bội số của 1M. Nếu không app sẽ crash. Địa chỉ bắt đầu của firmware được set cứng tại 0x10000</span>. Nếu muốn thay đổi cần thực hiện trong menuconfig.

# Tổng kết

Bài viết này giới thiệu tổ chức lưu trữ dữ liệu trên external flash và 2 partition table mặc định được dùng cho 2 loại firmware non-OTA và OTA.

Trong các bài viết tiếp theo mình sẽ giới thiệu các trường hơp sử dụng partition table này, cách build partition table và ghi vào bộ nhớ flash.

Chúng ta cũng có thể tạo custom partition table, ví dụ như tạo thêm partition có định dạng file system để dễ  dàng lưu trữ các file giống như các ứng dụng trên các OS cao cấp.
