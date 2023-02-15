---
layout: default
title: "Trình tự bootup trên Wireless MCU ESP8266"
short_description: "Trình tự bootup trên Wireless MCU ESP8266"
status: "Done"
picture: "assets/images/esp8266_block_diagram.png"
latest_release: "Unknown"
index: 4
---

# Esp8266 Bootup Sequence
## 1. Giới thiệu

Trong vài viết [Esp8266 Partition Table](esp8266_flash_map.html), mình đã giới thiệu về bảng partition table và thông tin cơ bản ROM, RAM và Flash của SoC Esp8266. Trong bài viết này mình sẽ bắt đầu giới thiệu về cách thức boot up của SoC Esp8266.

Có 2 thông tin ở bài [Esp8266 Partition Table](esp8266_flash_map.html) sẽ làm tiền đề cho bài viết này

> 1. ESP8266 có ROM, nhưng không phải ROM <span style="color:blue">có thể  ghi xóa</span>, cần gắn bộ nhớ ngoài để chứa mã ứng dụng.

- ROM sẽ chứa một chương trình thực thi (BL0) và một số thông tin riêng của nhà sản xuất ( ví dụ Mac address).
- BL0 được Espressif nạp sẵn vào ROM

> 2. Một bộ nhớ flash duy nhất trên ESP8266 có thể chứa nhiều ứng dụng và nhiều loại dữ liệu khác nhau. (calibration data, files systems, parameter storage). Vì lý do này mà một <span style="color:blue">bảng phân vùng (partition tables)</span>. sẽ được ghi vào offset 0x8000 trong bộ nhớ.

Để trả lời cho câu hỏi tại tao không ghi bảng phân vùng ở một địa chỉ nào khác mà phải là 0x8000 trên external flask thì mình cần phải dẫn dắt khá dài và sâu về thiết kế của SoC, nếu bạn chỉ quan tâm về tầng ứng dụng thì có thể chuyển qua tìm đọc các bài viết khác, tránh mất thời gian mà còn dễ tẩu hỏa !!

## 2. Ôn lại một chút về CPU

CPU (Central Processing Unit), với cái tên `bộ xử lý` nghe rất chung chung không biết là nó xử lý cái gì.

Xử lý ở đây là thực hiện các lệnh như: cộng, trừ, nhân, chia, dịch bít, đảo bít, clear, nghịch đảo, gán, copy ... Số lượng lệnh và mức độ tối ưu tùy thuộc vào kiến trúc mà CPU này dùng. Kiến trúc để xây dựng ra CPU thì rất nhiều, một vài cái tên tiêu biểu: Arm, x86, x64, RISC... chi tiết hơn tham khảo link này [https://en-academic.com/dic.nsf/enwiki/11834151](https://en-academic.com/dic.nsf/enwiki/11834151)

CPU có khả năng tính toán, nhưng nó biết tính toán cái gì bây giờ, nó cần chúng ta ra lệnh cho nó. Vậy thì lấy cái gì đó để chứa lệnh của chúng ta đi rồi kêu nó vào đó đọc hướng dẫn và làm theo. Vậy là người ta thiết kế ra ROM (Read Only Memory) để chứa chướng trình hướng dẫn CPU cần làm gì.

Nhưng mà sao phải là ROM ? dùng SD Card(MMC), eMMC, USB, SSD hay eSSD gì được không. Những thiết bị liệt kê ở trên cần cos controller mới hoạt động, cần khởi tạo trước, nếu để BL0 ở đây thì gặp bài toán quả trứng và con gà.

Làm thể nào để kết nối ROM với CPU? - Người ta dùng BUS (này là bus ở lớp physical), không chỉ có ROM mà các ngoại vi khác cũng nối chung vào BUS. Lúc này các ngoại vi nối vào BUS sẽ có địa chỉ. Vấn đề đã được giải quyêt rồi, CPU sẽ giao tiếp với các ngoạị vi thông qua địa chỉ của ngoại vi trên BUS (các địa chỉ này là physical address)

Vậy thì khi thiết kế CPU, ngay sau khi CPU thoát ra khỏi sự kiện POR (Power Of Reset) Hãy nhảy ngay đến đia chỉ của ROM (trên bus) để  thực thi lệnh, và địa chỉ này có tên là Reset Vector.

Và mỗi hãng sản xuất CPU cũng chọn cho riêng mình một địa chỉ, chi tiết coi ở đây nè [https://en.wikipedia.org/wiki/Reset_vector](https://en.wikipedia.org/wiki/Reset_vector#:~:text=The%20reset%20vector%20is%20a,the%20system%20containing%20the%20CPU.)

## 3. Quay lại với ESP8266

### 3.1 Mối liên hệ giữa CPU và ROM

Với dẫn dắt ở trên bạn sẽ dễ dàng đón nhận với thông tin mình cung cấp bên dưới:

> Reset vector is 0x40000080

Vậy là ta biết ngay địa chỉ internal ROM trên bus là 0x40000080, Để lục lại spec của ESP8266 xem nó có những ngoại vi gì nữa nào.

Nó nè:

![](../../../assets/images/esp8266_block_diagram.png)

Nhiều quá, để mình chạy đi kiếm cái bảng Address map của nó. Không thấy document nào nói, nhưng trong SDK của nó thì có thông tin đây.

```js
File: ESP8266_RTOS_SDK/components/esp8266/ld/esp8266.rom.ld
--------------------------------------------------
Vài thông tin cơ bản:
PROVIDE ( SPI_sector_erase = 0x400040c0 );
PROVIDE ( SPI_page_program = 0x40004174 );
PROVIDE ( SPI_read_data = 0x400042ac );
PROVIDE ( SPI_read_status = 0x400043c8 );
PROVIDE ( SPI_write_status = 0x40004400 );
PROVIDE ( SPI_write_enable = 0x4000443c );
PROVIDE ( Wait_SPI_Idle = 0x4000448c );
PROVIDE ( Enable_QMode = 0x400044c0 );
PROVIDE ( Disable_QMode = 0x40004508 );

PROVIDE ( Cache_Read_Enable = 0x40004678 );
PROVIDE ( Cache_Read_Disable = 0x400047f0 );

PROVIDE ( lldesc_build_chain = 0x40004f40 );
PROVIDE ( lldesc_num2link = 0x40005050 );
PROVIDE ( lldesc_set_owner = 0x4000507c );

PROVIDE ( gpio_input_get = 0x40004cf0 );
PROVIDE ( gpio_pin_wakeup_disable = 0x40004ed4 );
PROVIDE ( gpio_pin_wakeup_enable = 0x40004e90 );

PROVIDE ( ets_io_vprintf = 0x40001f00 );
PROVIDE ( uart_rx_one_char = 0x40003b8c );

PROVIDE ( rom_i2c_readReg = 0x40007268 );
PROVIDE ( rom_i2c_readReg_Mask = 0x4000729c );
PROVIDE ( rom_i2c_writeReg = 0x400072d8 );
PROVIDE ( rom_i2c_writeReg_Mask = 0x4000730c );

PROVIDE ( rom_software_reboot = 0x40000080 );
```
### 3.2 **Internal ROM boot (BL0)**

Như vậy ta đã biết sau khi được cấp nguồn, CPU sẽ đi lấy instruction lại địa chỉ `rom_software_reboot = 0x40000080`, đây là địa chỉ vật lý của internal ROM trên bus.

Mã thực thi nằm trên ROM này do Espressif nạp sẵn từ trước, cung cấp cho chúng ta hai chức năng chính:

- Khởi tạo UART và cung cấp APIs cho user tương tác với SoC, các lệnh hiện tại mà ROM hỗ trợ:

```js
File: ESP8266_RTOS_SDK/components/esptool_py/esptool/esptool.py

esptool.py v2.4.0
usage: esptool [-h] [--chip {auto,esp8266,esp32}] [--port PORT] [--baud BAUD] [--before {default_reset,no_reset,no_reset_no_sync}] [--after {hard_reset,soft_reset,no_reset}] [--no-stub]
               [--trace] [--override-vddsdio [{1.8V,1.9V,OFF}]]
               {load_ram,dump_mem,read_mem,write_mem,write_flash,run,image_info,make_image,elf2image,read_mac,chip_id,flash_id,read_flash_status,write_flash_status,read_flash,verify_flash,erase_flash,erase_region,version}

    load_ram            Download an image to RAM and execute
    dump_mem            Dump arbitrary memory to disk
    read_mem            Read arbitrary memory location
    write_mem           Read-modify-write to arbitrary memory location
    write_flash         Write a binary blob to flash
    run                 Run application code in flash
    image_info          Dump headers from an application image
    make_image          Create an application image from binary files
    elf2image           Create an application image from ELF file
    read_mac            Read MAC address from OTP ROM
    chip_id             Read Chip ID from OTP ROM
    flash_id            Read SPI flash manufacturer and device ID
    read_flash_status   Read SPI flash status register
    write_flash_status  Write SPI flash status register
    read_flash          Read SPI flash content
    verify_flash        Verify a binary blob against flash
    erase_flash         Perform Chip Erase on SPI flash
    erase_region        Erase a region of the flash
    version             Print esptool version
```

- Chức năng thứ hai là đi load First stage bootloader(BL1) vào SRAM và thực thi.

### **3.3 First Stage Bootloader (BL1)**

#### **3.3.1 First Stage Bootloader là gì ?**

First Stage bootloader cũng là mã thực thi để  yêu cầu CPU thực hiện các công việc mà chúng ta mong muốn.

#### **3.3.2 Tại sao lại cần First Stage Bootloader?**

Đích đến cuối cùng của chúng ta là CPU phải load được mã thực thi của ứng dụng mà chúng ta viết (ví dụ 1 web client, mqtt client, socket, LED, LCD ...), cách nhanh nhất là dùng một chip ROM có hỗ trợ ghi/xóa, và nạp thẳng mã thực thi của ứng dụng vào đây, CPU boot lên là chạy ngay ứng dụng của chúng ta luôn.

Cách trên rất tốn kém vì ROM đã mắc, hỗ trợ ghi xóa càng mắc, dung lượng lớn nữa thì khỏi suy nghĩ thêm chi. Chính vì vậy người ta chia nhỏ các giai đoạn ra, cần một First Stage Boot loader có kích thước nhỏ (đỡ tiền chip ROM), First Stage Boot loader cũng không cần thiết phải thay đổi thường xuyên (dùng luôn ROM chỉ ghi 1 lần cho rẻ hơn nữa, nhưng nguy hiểm vì lỡ có lỗi gì thì không sửa được, ROM external thì còn thay được, ROM internal thì coi như bỏ luôn SoC).

> Vậy thì BL0 load thẳng mã thực thi của user luôn chứ cần gì phải load First Stage Bootloader làm gì?

- Không đủ dung lượng để load user code vào SRAM
- Không linh hoạt khi muốn thực hiện load các ứng dụng khác nhau ở các địa chỉ khác nhau (dùng trong chức năng firmware update)

#### 3.3.3 Tại sao lại cần First Stage Bootloader trên ESP8266?

ESP8266 không có nhiều ngoại vi cần thay đổi, đặc điểm duy nhất mà nó có thể tận dụng là khả năng load file thực thi vào RAM và trao quyền thực thi CPU đến địa chỉ vừa load.

Sử dụng tính năng này ta có thể phát triển tính năng firmware update lúc runtime (cập nhật firmware trong lúc CPU vẫn đang hoạt động, không phải dừng để đưa CPU vào chế độ update firmware), OTA - Over The Air firmware update là một ứng dụng thực tế.

> Đến đây mình đã trả lời được câu hỏi tại sao cần có partition table ở trên. Ví dụ trong trường hợp có dùng OTA

ESP8266 OTA Partition Table

| Name      | Type  | SubType | Offset   | Size    |
|:----------|:----- |:--------|:---------|:--------|
|nvs        |data   | nvs     | 0x9000   | 0x4000  |
|otadata    |data   | ota     | 0xd000   | 0x2000  |
|phy_init   |data   | phy     | 0xf000   | 0x1000  |
|ota_0      |0      | ota_0   | 0x10000  | 0xF0000 |
|ota_1      |0      | ota_1   | 0x110000 | 0xF0000 |

- Quá rõ ràng, First Stage Bootloader khi được thực thi sẽ kiểm tra xem user đang muốn load file thực thi ở đâu (đọc dữ liệu tại địa chỉ `otadata (0xd000)` trên flash). Chỉ có 2 chỗ (`ota_0` và `ota_1`), load vào SRAM  sau đó yêu cầu CPU chạy instruction từ địa chỉ vừa load.

```js
ets Jan  8 2013,rst cause:2, boot mode:(3,6)

<span style="color:blue">load 0x40100000, len 7044, room 16 </span>
tail 4
chksum 0x33
load 0x3ffe8408, len 24, room 4
tail 4
chksum 0xda
load 0x3ffe8420, len 3328, room 4
tail 12
chksum 0x8f
csum 0x8f
I (42) boot: ESP-IDF v3.4-53-g7270911-dirty 2nd stage bootloader
I (43) boot: compile time 00:08:54
I (43) qio_mode: Enabling default flash chip QIO
I (51) boot: SPI Speed      : 40MHz
I (58) boot: SPI Mode       : QIO
I (64) boot: SPI Flash Size : 4MB
I (70) boot: Partition Table:
I (76) boot: ## Label            Usage          Type ST Offset   Length
I (87) boot:  0 nvs              WiFi data        01 02 00009000 00006000
I (98) boot:  1 phy_init         RF data          01 01 0000f000 00001000
I (110) boot:  2 factory          factory app      00 00 00010000 000f0000
I (121) boot: End of partition table
I (128) esp_image: segment 0: paddr=0x00010010 vaddr=0x40210010 size=0x1ce00 (118272) map
0x40210010: _stext at ??:?

I (181) esp_image: segment 1: paddr=0x0002ce18 vaddr=0x4022ce10 size=0x0717c ( 29052) map
I (192) esp_image: segment 2: paddr=0x00033f9c vaddr=0x3ffe8000 size=0x00554 (  1364) load
I (193) esp_image: segment 3: paddr=0x000344f8 vaddr=0x40100000 size=0x00080 (   128) load
I (206) esp_image: segment 4: paddr=0x00034580 vaddr=0x40100080 size=0x050b4 ( 20660) load
I (226) boot: Loaded app from partition at offset 0x10000
Hello world!
```

#### **3.3.4 First Stage Bootloader được lưu ở đâu trên flash ?**

Ngay tại địa chỉ 0x00 của flash

### **3.4 First được thực thi như thế nào trên ESP8266?**

Ở những phần trên mình giới thiệu cách thức CPU load BL0 và BL1 load user application.

Phần này mình giới thiệu làm thế nào BL0 load BL1, xong phần này ta đã có các bước hoàn chỉnh từ lúc bật nguồn cho đến lúc user application được thực thi.

Bây giờ mình sẽ đi xóa hoàn toàn bộ nhớ flash để xem ESP8266 nó làm gì.

Từ serial console của ROM code:

```js
 ets Jan  8 2013,rst cause:2, boot mode:(3,7)

ets_main.c
```

So sánh với trường hợp chạy thành công:

```js
ets Jan  8 2013,rst cause:2, boot mode:(3,6)

<span style="color:blue">load 0x40100000, len 7044, room 16 </span>
tail 4
chksum 0x33
load 0x3ffe8408, len 24, room 4
tail 4
chksum 0xda
load 0x3ffe8420, len 3328, room 4
tail 12
chksum 0x8f
csum 0x8f
```

Theo kinh nghiệm với các embedded khác, thì việc chọn boot từ đâu có hai khả năng:

1. ROM code tự động lần lượt tìm kiếm trên các interface mà SoC đang có.
2. ROM code sẽ đọc các chân config trên SoC để biết user đang muốn chủ động boot từ đâu. Ví dụ SoC có hỗ trợ eMMC, SD Card, SSD, USB, thì ROM code sẽ chủ động đi tìm code đúng theo cấu hình của user.

ví dụ trên board iMX8MQ

![](../../../assets/images/imx8mq/imx8mq_boot_mode.png)

ESP8266 sủ dụng GPIO pin để config boot mode, chi tiết xem ở đây [Esp8266 Boot mode selection](https://docs.espressif.com/projects/esptool/en/latest/esp8266/advanced-topics/boot-mode-selection.html)

| GPIO15 | GPIO0 | GPIO2 | Mode   | Description |
|:-------|:----- |:------|:-------|:------------|
| L      | L     | H     | UART   | Download code from UART  |
| L      | H     | H     | Flash  | Boot from SPI Flash   |
| H      | X     | X     | SDIO   | Boot from SD-card   |

Esp8266 có in ra bootmode `boot mode:(3,6)`, ý nghĩa của nó như sau:

>boot mode:(3,6) ==> boot mode:(m,n)

- Giá trị của m

|m      | GPIO15 | GPIO0 | GPIO2 | Mode |
|:------|:-------|:------|:------|:-----|
|1      |0       |0      |1      |UART  |
|3      |0       |1      |1      |Flash |
|4,5,6,7|1       |X      |x      |SDIO  |

- Giá trị của n: [trang chủ của Espressif](https://docs.espressif.com/projects/esptool/en/latest/esp8266/advanced-topics/boot-mode-selection.html) không đề cập đến giá trị này, mình chỉ tìm được [thông tin](https://riktronics.wordpress.com/2017/10/02/esp8266-error-messages-and-exceptions-explained/) như sau

| n | SD_sel != 3         | SD_sel == 3   |
|:--|:--------------------|:--------------|
| 6 |SDIO LowSpeed V1 IO  | UART1 booting |
| 7 |SDIO HighSpeed V2 IO | UART1 booting |

### **3.3 Second Stage Bootloader (BL2)**

BL2 khởi tạo tất cả các ngoại vi còn lại, bước quan trọng nhất là khởi tạo DRAM chuẩn bị cho việc load kernel.

ESP8266 không dùng DRAM, nên user application thay thế cho BL2.

## 4. Tổng kết

Qua hai bài biết [Esp8266 Partition Table](flash_map.html) và [Esp8266 boot-up sequence](esp8266_boot_up.html) mình đã giới thiệu bảng phân vùng, tại sao lại cần có nó, internal ROM boot, First Stage Bootloader, user application, boot configuration và mối liên hệ giữa chúng.

Ngoài ra mình cũng giới thiệu boot sequence của ESP8266, nắm được những thông tin này sẽ giúp bạn dễ dàng gỡ lỗi trong quá code và phát triển chức năng OTA đúng cách.


