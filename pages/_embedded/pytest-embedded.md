---
layout: default
title: "Pytest-Embedded"
short_description: "Mình thử plugin pytest-embedded của Espressif: cài đặt, các service, chạy test hello world trên ESP32-C3"
picture: "assets/images/pytest-embedded.png"
commit1: "Init document"
latest_release: "Add description and example"
status: "Done"
index: 4
publish: true
---

# Pytest-Embedded
{: .no_toc }
## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------
## Introduction

Sau khi học [pytest](/embedded/pytest), mình muốn dùng nó để test firmware trên board thật chứ không chỉ test code Python. Espressif có sẵn plugin cho chuyện này; ở cuối bài là lần mình chạy ví dụ esp-idf của họ trên một con ESP32-C3 (log ngày 14/02/2023).

- Pytest-embedded là một plugin cho công cụ <a target="_blank" href="/embedded/pytest">pytest</a>
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

### Example

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
- Kết quả (mình cắt bớt phần nạp flash và boot log ở giữa, chỗ `...`):

```
 pytest
================================================================================================ test session starts =================================================================================================
platform linux -- Python 3.10.6, pytest-7.2.0, pluggy-1.0.0
plugins: rerunfailures-11.1, embedded-0.7.10
collected 1 item

hello_world/test_hello_world.py::test_hello_world 2023-02-14 11:36:21 Serial port /dev/ttyUSB1
...
2023-02-14 11:36:22 INFO Target: esp32c3, Port: /dev/ttyUSB1
...
2023-02-14 11:36:26 INFO Logs recorded under folder: /tmp/pytest-embedded/2023-02-14_04-36-21/test_hello_world
...
2023-02-14 11:36:26 I (146) boot: Loaded app from partition at offset 0x10000
...
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
