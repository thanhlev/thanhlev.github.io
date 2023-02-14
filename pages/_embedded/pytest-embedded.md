---
layout: default
title: "Pytest-Embedded"
short_description: "Khái niệm và cách dùng pluggin này cho embedded project"
picture: "assets/images/pytest_diagram.png"
commit1: "Init document"
latest_release: "Add description and example"
status: "Inprogress"
---

# Pytest-Embedded
{: .no_toc }
![](../../../assets/images/pytest_diagram.png)
## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------
## Revision history

| Revision | Date          | Remark      |
|:---------|:------------- |:------------|
| 0.1      | Feb-08-2023   | {{page.commit1}}|
| 0.2      | Feb-14-2023   | {{page.latest_release}}|

## Giới thiệu

- Pytest-embedded là một pluggin cho công cụ <a target="_blank" href="pytest.html">pytest</a>
- Được publish trên PyPi (<a target="_blank" href="https://pypi.org/project/pytest-embedded/">pypi.org/project/pytest-embedded</a>), có thể cài trực tiếp bằng lệnh `pip install pytest-embedded`
- Tài liệu: <a target="_blank" href="https://docs.espressif.com/projects/pytest-embedded/en/latest/">docs.espressif.com/projects/pytest-embedded</a>
- Source code: <a target="_blank" href="https://github.com/espressif/pytest-embedded">github.com/espressif/pytest-embedded</a>

## Cách dùng

### Cài đặt

```script
pip3 install pytest-embedded
```
Sau khi cài đặt, pytest tự động scan plugin đã được cài, kiểm tra plugin đã được cài thành công

```script
pytest --help
---
embedded:
  ...
embedded-serial:
  ...
embedded-esp:
  ...
embedded-idf:
  ...
embedded-jtag:
  ...
embedded-qemu:
  ...
```
### Đăng ký sử dụng

```yaml
# file pytest.ini
addopts =
  --embedded-services esp,idf

```
Giá trị của option `embedded-services`

```
 --embedded-services=EMBEDDED_SERVICES
    Activate comma-separated services for different functionalities. (Default: "")
    Available services:
    - serial: open serial port
    - esp: auto-detect target/port by esptool
    - idf: auto-detect more app info with idf specific rules, auto flash-in
    - jtag: openocd and gdb
    - qemu: use qemu simulator instead of the real target
    - arduino: auto-detect more app info with arduino specific rules, auto flash-in
    All the related CLI options are under the groups named by "embedded-<service>"
```

### Ví dụ

- Giả sữ ta cần test đoạn code sau đây cho MCU ESP32

```C
#include <stdio.h>
#include "sdkconfig.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_chip_info.h"
#include "esp_flash.h"

void app_main(void)
{
    printf("Hello world!\n");

    /* Print chip information */
    esp_chip_info_t chip_info;
    uint32_t flash_size;
    esp_chip_info(&chip_info);
    printf("This is %s chip with %d CPU core(s), WiFi%s%s, ",
           CONFIG_IDF_TARGET,
           chip_info.cores,
           (chip_info.features & CHIP_FEATURE_BT) ? "/BT" : "",
           (chip_info.features & CHIP_FEATURE_BLE) ? "/BLE" : "");

    printf("silicon revision %d, ", chip_info.revision);
    if(esp_flash_get_size(NULL, &flash_size) != ESP_OK) {
        printf("Get flash size failed");
        return;
    }

    printf("%uMB %s flash\n", flash_size / (1024 * 1024),
           (chip_info.features & CHIP_FEATURE_EMB_FLASH) ? "embedded" : "external");

    printf("Minimum free heap size: %d bytes\n", esp_get_minimum_free_heap_size());

    for (int i = 10; i >= 0; i--) {
        printf("Restarting in %d seconds...\n", i);
        vTaskDelay(1000 / portTICK_PERIOD_MS);
    }
    printf("Restarting now.\n");
    fflush(stdout);
    esp_restart();
}
```

- Tiếp theo viết một file test tuân theo yêu cầu của `pytest`

```python
# nội dụng file test_hello_world_app.py
import logging


def test_hello_world(dut):
    # expect from what esptool.py printed to sys.stdout
    dut.expect('Hash of data verified.')

    # now the `dut.expect` would return a `re.Match` object if succeeded
    res = dut.expect(r'Hello (\w+)!')

    # don't forget to decode, since the serial outputs are all bytes
    logging.info(f'hello to {res.group(1).decode("utf8")}')

    # of course you can just don't care about the return value, do an assert only :)
    dut.expect('Restarting')
```
- Theo thiết kế của `pytest` , biến `dut` là một fixture, biến này được pluggin `pytest-embedded` cung cấp. Code và mô tả của nó:

```yaml
dut -- ../../.espressif/python_env/idf5.0_py3.10_env/lib/python3.10/site-packages/pytest_embedded/plugin.py:1013
    A device under test (DUT) object that could gather output from various sources and redirect them to the pexpect
    process, and run `expect()` via its pexpect process.
```
- Biến `dut` là một object đại diện cho serial console log của MCU ESP32. Object này cung cấp 2 method quan trọng là `write(text)` và `expect(text)` giúp test code tương tác với firmware.

- Cuối cùng, để test framework `pytest` biết được cần lấy fixture `dut` từ đâu, cần đăng ký service với pytest-embedded trong file config hoặc truyền trực tiếp option khi chạy pytest.


```yaml
# file pytest.ini

addopts =
  --embedded-services esp,idf
```
### Chạy test ví dụ

- Đầu tiên cần build project đúng với MCU ESP32 đang có

```script
idf.py -C hello_world set-target esp32c3
idf.py -C hello_world all
```
- Kết nối phần cứng và chạy test

```script
pytest
```
- Kết quả

```
 pytest
================================================================================================ test session starts =================================================================================================
platform linux -- Python 3.10.6, pytest-7.2.0, pluggy-1.0.0
rootdir: /home/thanhle/build/pytest-embedded/examples/esp-idf, configfile: pytest.ini
plugins: rerunfailures-11.1, embedded-0.7.10
collected 1 item

hello_world/test_hello_world.py::test_hello_world 2023-02-14 11:36:21 Serial port /dev/ttyUSB1
2023-02-14 11:36:21 Connecting....
2023-02-14 11:36:22 Uploading stub...
2023-02-14 11:36:22 Running stub...
2023-02-14 11:36:22 Stub running...

--------------------------------------------------------------------------------------------------- live log setup ---------------------------------------------------------------------------------------------------
2023-02-14 11:36:22 INFO Target: esp32c3, Port: /dev/ttyUSB1
2023-02-14 11:36:22 Changing baud rate to 921600
2023-02-14 11:36:22 Changed.
2023-02-14 11:36:22 Flash will be erased from 0x00000000 to 0x00004fff...
2023-02-14 11:36:22 Flash will be erased from 0x00008000 to 0x00008fff...
2023-02-14 11:36:22 Flash will be erased from 0x00010000 to 0x00036fff...
2023-02-14 11:36:22 Compressed 20192 bytes to 12397...
Wrote 20192 bytes (12397 compressed) at 0x00000000 in 0.5 seconds (effective 327.8 kbit/s)...
2023-02-14 11:36:23 Hash of data verified.
2023-02-14 11:36:23 Compressed 3072 bytes to 103...
Wrote 3072 bytes (103 compressed) at 0x00008000 in 0.1 seconds (effective 453.9 kbit/s)...
2023-02-14 11:36:23 Hash of data verified.
2023-02-14 11:36:23 Compressed 156432 bytes to 84829...
Wrote 156432 bytes (84829 compressed) at 0x00010000 in 2.6 seconds (effective 480.2 kbit/s)...
2023-02-14 11:36:26 Hash of data verified.
2023-02-14 11:36:26
2023-02-14 11:36:26 Leaving...
2023-02-14 11:36:26 Changing baud rate to 115200
2023-02-14 11:36:26 Changed.
2023-02-14 11:36:26 Hard resetting via RTS pin...
2023-02-14 11:36:26 INFO Logs recorded under folder: /tmp/pytest-embedded/2023-02-14_04-36-21/test_hello_world
2023-02-14 11:36:26 ESP-ROM:esp32c3-api1-20210207
2023-02-14 11:36:26 Build:Feb  7 2021
2023-02-14 11:36:26 rst:0x1 (POWERON),boot:0xc (SPI_FAST_FLASH_BOOT)
2023-02-14 11:36:26 SPIWP:0xee
2023-02-14 11:36:26 mode:DIO, clock div:1
2023-02-14 11:36:26 load:0x3fcd5820,len:0x16ec
2023-02-14 11:36:26 load:0x403cc710,len:0x96c
2023-02-14 11:36:26 load:0x403ce710,len:0x2e2c
2023-02-14 11:36:26 entry 0x403cc710
2023-02-14 11:36:26 I (30) boot: ESP-IDF v5.0-5-g6b42fa76e7-dirty 2nd stage bootloader
2023-02-14 11:36:26 I (30) boot: compile time 11:35:46
2023-02-14 11:36:26 I (30) boot: chip revision: v0.3
2023-02-14 11:36:26 I (34) boot.esp32c3: SPI Speed      : 80MHz
2023-02-14 11:36:26 I (39) boot.esp32c3: SPI Mode       : DIO
2023-02-14 11:36:26 I (43) boot.esp32c3: SPI Flash Size : 2MB
2023-02-14 11:36:26 I (48) boot: Enabling RNG early entropy source...
2023-02-14 11:36:26 I (53) boot: Partition Table:
2023-02-14 11:36:26 I (57) boot: ## Label            Usage          Type ST Offset   Length
2023-02-14 11:36:26 I (64) boot:  0 nvs              WiFi data        01 02 00009000 00006000
2023-02-14 11:36:26 I (72) boot:  1 phy_init         RF data          01 01 0000f000 00001000
2023-02-14 11:36:26 I (79) boot:  2 factory          factory app      00 00 00010000 00100000
2023-02-14 11:36:26 I (87) boot: End of partition table
2023-02-14 11:36:26 I (91) esp_image: segment 0: paddr=00010020 vaddr=3c020020 size=07048h ( 28744) map
2023-02-14 11:36:26 I (104) esp_image: segment 1: paddr=00017070 vaddr=3fc8aa00 size=014c0h (  5312) load
2023-02-14 11:36:26 I (109) esp_image: segment 2: paddr=00018538 vaddr=40380000 size=07ae0h ( 31456) load
2023-02-14 11:36:26 I (122) esp_image: segment 3: paddr=00020020 vaddr=42000020 size=134ech ( 79084) map
2023-02-14 11:36:26 I (137) esp_image: segment 4: paddr=00033514 vaddr=40387ae0 size=02dbch ( 11708) load
2023-02-14 11:36:26 I (139) esp_image: segment 5: paddr=000362d8 vaddr=50000010 size=00010h (    16) load
2023-02-14 11:36:26 I (146) boot: Loaded app from partition at offset 0x10000
2023-02-14 11:36:26 I (149) boot: Disabling RNG early entropy source...
2023-02-14 11:36:26 I (165) cpu_start: Pro cpu up.
2023-02-14 11:36:26 I (174) cpu_start: Pro cpu start user code
2023-02-14 11:36:26 I (174) cpu_start: cpu freq: 160000000 Hz
2023-02-14 11:36:26 I (174) cpu_start: Application information:
2023-02-14 11:36:26 I (177) cpu_start: Project name:     hello_world
2023-02-14 11:36:26 I (183) cpu_start: App version:      v1.2.3
2023-02-14 11:36:26 I (187) cpu_start: Compile time:     Feb 14 2023 11:35:33
2023-02-14 11:36:26 I (193) cpu_start: ELF file SHA256:  7a5b2d32bb2b93f0...
2023-02-14 11:36:26 I (199) cpu_start: ESP-IDF:          v5.0-5-g6b42fa76e7-dirty
2023-02-14 11:36:26 I (206) heap_init: Initializing. RAM available for dynamic allocation:
2023-02-14 11:36:26 I (213) heap_init: At 3FC8CD40 len 0004F9D0 (318 KiB): DRAM
2023-02-14 11:36:26 I (219) heap_init: At 3FCDC710 len 00002950 (10 KiB): STACK/DRAM
2023-02-14 11:36:26 I (226) heap_init: At 50000020 len 00001FE0 (7 KiB): RTCRAM
2023-02-14 11:36:26 I (233) spi_flash: detected chip: generic
2023-02-14 11:36:26 I (237) spi_flash: flash io: dio
2023-02-14 11:36:26 W (241) spi_flash: Detected size(4096k) larger than the size in the binary image header(2048k). Using the size in the binary image header.
2023-02-14 11:36:26 I (254) cpu_start: Starting scheduler.
2023-02-14 11:36:26 Hello world!
2023-02-14 11:36:26 This i--------------------------------------------------------------------------------------------------- live log call ----------------------------------------------------------------------------------------------------
2023-02-14 11:36:26 INFO hello to world
s esp32c3 chip with 1 CPU core(s), WiFi/BLE, silicon revision 3, 2MB external flash
2023-02-14 11:36:26 Minimum free heap size: 326548 bytes
2023-02-14 11:36:26 Restarting in 10 seconds...
PASSED

================================================================================================= 1 passed in 5.01s ==================================================================================================
```

- Nguồn: [https://github.com/espressif/pytest-embedded/tree/main/examples/esp-idf](https://github.com/espressif/pytest-embedded/tree/main/examples/esp-idf)
