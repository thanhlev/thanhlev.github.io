---
layout: default
title: "Programming Language snippets"
short_description: "Các snippet code hay dùng"
status: "In Progress"
picture: "assets/images/programming_snippets_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: rewritten as a STAR story"
index: 7
publish: true
tags: [linux, tools]
lang: vi   # 2026-11-23: Vietnamese post -> IBM Plex Sans (Atkinson Hyperlegible has no Vietnamese glyphs)
permalink: /linux_general/programming-snippets   # 2026-11-27: = the URL the collection default gave it; explicit so it never moves
description: "Các snippet code hay dùng"
date: 2023-02-21
last_modified_at: 2026-11-27
---

# Programming Language snippets
{: .no_toc }

![Programming snippets]({{ '/assets/images/programming_snippets_cover.jpg' | relative_url }})
*Mười đoạn Python, mỗi đoạn một tiêu đề, Ctrl+F là ra.*

## Table of contents
{: .no_toc }

1. TOC
{:toc}

---

## Situation

Mình viết khá nhiều script Python nhỏ: đọc một file config json, nhận vài option từ dòng lệnh, gọi một lệnh shell rồi lấy output, regex một dòng log. Mấy đoạn đó script nào cũng cần, gần như y hệt nhau.

## Task

Gom các đoạn đó vào một chỗ để copy thẳng. Tên trang ghi "Programming Language" nhưng tới giờ mới có Python.

## Action

### Python

#### Open/write/close a file

```python
# check file is exists
os.path.isfile("config.json")

# Open for reading
fh = open(configFile, "r")
data = fh.read()

# Open for writing
file = open("config.json", "w")
file.write(json.dumps(json_object, indent=4, sort_keys=True))
file.flush()
file.close()
```

#### Atexit

Hàm đăng ký bằng `atexit` chạy khi script thoát bình thường, tiện để dọn dẹp hoặc in log cuối.

```python
import atexit

@atexit.register
def goodbye():
    print('You are now leaving the Python sector.')
```

#### Parse options (optparse)

Đoạn này mình chép ra từ một method trong class, nên nó còn tham số `self`. Dùng như hàm thường thì bỏ `self` đi.

```python
from optparse import OptionParser

def parseOpt(self, args):
    usage = "usage: %prog [options] arg"
    parser = OptionParser(usage)
    parser.add_option("-t", "--test", action="store", type="string", dest="test",help="Test store string")
    parser.add_option("--bool",action="store_const", const=1, dest="bool",help="Test store bool")
    parser.add_option("--value", action="store", type="int", dest="value",help="common value for other command")

    (options, args) = parser.parse_args(args)
    if len(args) != 1:
        parser.error("incorrect number of arguments")
    if options.bool:
        print(options.bool)
    if options.value:
        print("value = ", options.value)
    if options.test:
        print("test = ", options.test)

if __name__ == "__main__":
    parseOpt(sys.argv)
```

#### json

```python
# load from string data
j_obj = json.loads(str_data)

# Level 1 keys
for key in j_obj.keys():
    print(f"key {key}, data: {j_obj[key]}")
```

#### Regular Expression

```python
import re
string = "hello MY_PC_NAME , value: 1.34"

# match name and value
pattern = 'hello (\D+) , value: (\d+.\d+)'
match = re.search(pattern, string)
if match:
    print(f'str: {match.group(1)}, value: {match.group(2)}')
```

#### subprocess

```python
import subprocess

def system_call(command):
    return str(subprocess.getoutput(command))
```

#### Natural Sort

`sorted()` so chuỗi theo từng ký tự nên "10" đứng trước "2"; `natsort` so phần số như số.

```python
from natsort import natsorted

list = ["1", "10", "2", "22", "3", "55"]
print(natsorted(list)) # 1,2,3,10,22,55
```

#### Play beep audio

```python
import beepy as beep

beep.beep(1)
beep.beep(2)
...
beep.beep(10)
```

#### Trim string white space

```python
str("   hello    ").strip()
```

#### Date and time

```python
from datetime import datetime, date

datetime.utcnow()
datetime.utcnow().hour
datetime.utcnow().minute
datetime.utcnow().second
datetime.utcnow().timetuple().tm_yday # day of year
datetime.utcnow().timetuple().tm_year
datetime.utcnow().timetuple().tm_mon
datetime.utcnow().timetuple().tm_mday
datetime.utcnow().timetuple().tm_hour
datetime.utcnow().timetuple().tm_min
datetime.utcnow().timetuple().tm_sec
datetime.utcnow().timetuple().tm_wday
import calendar
today = date.today()
weekday = today.weekday()
day_name = calendar.day_name[today.weekday()]
current_day = today.strftime("%b-%d-%Y")
current_day_object = datetime.strptime(current_day, '%b-%d-%Y')
current_day_utc = current_day_object.utcnow().strftime("%b-%d-%Y")
```

Dòng `tm_yday` trước đây ghi chú bằng `//` kiểu C, Python không hiểu và báo lỗi cú pháp; giờ đã đổi thành `#`.

## Result

Trang giờ là mười đoạn Python, mỗi đoạn một tiêu đề riêng nên Ctrl+F hay mục lục là ra. Các đoạn không kèm `import os, json, sys`, cái đó tự thêm ở đầu file.

## What I'd do next

Hai đoạn đã cũ so với Python bây giờ. `optparse` bị đóng băng từ lâu, script mới nên dùng `argparse`. `datetime.utcnow()` bị đánh dấu deprecated từ Python 3.12, thay bằng `datetime.now(timezone.utc)`. Mình chưa viết lại hai đoạn đó. Phần C thì vẫn chưa có gì, dù tên trang đã hứa.
