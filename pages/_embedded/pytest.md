---
layout: default
title: "Pytest"
short_description: "Pytest và cách sử dụng"
picture: "assets/images/pytest_diagram.png"
commit1: "Init document"
commit2: "Add marks"
commit3: "Add configuration example"
latest_release: "Add plugin"
status: "Inprogress"
---

# Pytest và cách sử dụng
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
| 0.1      | Feb-07-2023   | {{page.commit1}}|
| 0.2      | Feb-08-2023   | {{page.commit2}}|
| 0.3      | Feb-08-2023   | {{page.commit3}}|
| 0.4      | Feb-09-2023   | {{page.latest_release}}|

## Giới thiệu

- Pytest là một công cụ test code miễn phí được cộng đồng phát triển.
- Với các plugins mở rộng, được dùng cho các công CI để test tự động.

## Hoạt động

### Ví dụ

- tạo file test: `test_sample.py`

```python
# content of demo/test_sample.py
def sumOf(a,b):
    return a + b


def test_answer1():
    assert sumOf(3,6) == 8
def test_answer2():
    assert sumOf(3,1) == 4
```
- Chạy test

```shell
cd demo
pytest

============================= test session starts ==============================
platform linux -- Python 3.10.6, pytest-7.2.1, pluggy-1.0.0
rootdir: /home/thanhle/build/test
collected 2 items

test_sample.py F.                                                        [100%]

=================================== FAILURES ===================================
_________________________________ test_answer1 _________________________________

    def test_answer1():
>       assert sumOf(3,6) == 8
E       assert 9 == 8
E        +  where 9 = sumOf(3, 6)

test_sample.py:6: AssertionError
=========================== short test summary info ============================
FAILED test_sample.py::test_answer1 - assert 9 == 8
========================= 1 failed, 1 passed in 0.02s ==========================
thanhle@thanhle ~/build/test

```
### Giải thích

- pytest là một module, khi được gọi nó sẽ tìm ở thư mục hiện tại tất cả các file có dạng `test_*.py` và thực thi nó(file `test_sample.py` thõa điều kiện)
- Bên trong mỗi file `test_*.py`, pytest tìm các hàm có dạng `test*(x)` và chạy nó (hàm `test_answer1` và `test_answer2` thõa điều kiện)


## Sử dụng fixtures

### Ví dụ

```python
# content of demo/test_sample.py
def sumOf(a,b):
    return a + b

def test_answer(a_val, b_val):
    assert sumOf(a_val, b_val) == a_val + b_val

```
- Nếu chạy pytest với nội dung như trên, pytest sẽ không biết lấy `a_val` và `b_val` từ đâu.

- fixtures được thiết kế để cung cấp giá trị này cho hàm test, 2 fixtures cung cấp giá trị cho `a_val` và `b_val` được khai báo như sau

```python
@pytest.fixture
def a_val():
    return 10

@pytest.fixture
def b_val():
    return 5
```

- File cuối cùng

```python
import pytest

@pytest.fixture
def a_val():
    return 10
@pytest.fixture
def b_val():
    return 5

def sumOf(a,b):
    return a + b


def test_answer(a_val, b_val):
    assert sumOf(a_val, b_val) == a_val + b_val

```
### Các biến thể của fixtures

#### nested fixtures
- biến đầu vào của một fixtures là một fixtures khác

```python
# Ví dụ về nested fixtures
import pytest
# Arrange
@pytest.fixture
def first_entry():
    return "a"
# Arrange
@pytest.fixture
def order(first_entry):
    return [first_entry]
def test_string(order):
    # Act
    order.append("b")
    # Assert
    assert order == ["a", "b"]
```
#### Sử dụng lại fixtures
- giá trị `a_val` đưa vào 2 test case là giá trị ban đầu được hàm `@pytest.fixture` tạo ra, giúp các test case không bị ảnh hưởng lẫn nhau.

```python
# Ví dụ về sử dụng lại fixtures
import pytest

@pytest.fixture
def a_val():
    return 10


def test_answer1(a_val):
    tmp = a_val
    print("a_val", a_val)
    a_val = a_val + 1
    assert a_val == tmp + 1
def test_answer2(a_val):
    assert a_val == 11 <<<<< Fail ở đây, a_val = 10
```
- Nếu một fixtures được gọi trong một test, hoặc hàm con của test, thì pytest chỉ request 1 lần, những lần sau dùng cache
#### Autouse fixtures
- pytest tự động gọi fixture để lấy giá trị mà không cần check có test hoặc fixture nào khác cần tới không.

```python
# Ví dụ Autouse fixtures
@pytest.fixture(autouse=True)
def a_val():
    return 10
```

#### Fixture trả về một hàm

```python
@pytest.fixture
def make_customer_record():
    def _make_customer_record(name):
        return {"name": name, "orders": []}
    return _make_customer_record
def test_customer_records(make_customer_record):
    customer_1 = make_customer_record("Lisa")
    customer_2 = make_customer_record("Mike")
    customer_3 = make_customer_record("Meredith")
```

#### Fixture có tham số [HOT]

- Ví dụ

```python
# content of conftest.py
import smtplib
import pytest
@pytest.fixture(scope="module", params=["smtp.gmail.com", "mail.python.org"])
def smtp_connection(request):
    smtp_connection = smtplib.SMTP(request.param, 587, timeout=5)
    yield smtp_connection
    print(f"finalizing {smtp_connection}")
    smtp_connection.close()
```
- Pytest sẽ thực hiện tạo lần lượt các instance `smtp_connection` ứng với mỗi phần tử của array `params`. Các test được thực hiện trên lần lượt các instance này.
- Code của test sẽ không cần thay đổi gì


#### Chia sẽ fixtures giữa các test khác nhau [HOT]

- Trong các ví dụ trên, fixture được tạo ta trong mỗi test, chúng là các instance độc lập nhau.
- Có những fixture cần được tái sử dụng lại trong toàn bộ quá trình test: ví dụ một ssh connection, serial connection, Wi-Fi connection ...
- pytest sử dụng 1 file `conftest.py` để chứa các fixture được khởi tạo 1 lần và dùng chung cho nhiều test.

```python
# content of conftest.py
import smtplib
import pytest

@pytest.fixture(scope="module") # Phạm vi của fixture
def smtp_connection():
    return smtplib.SMTP("smtp.gmail.com", 587, timeout=5)
```
file test
```python
# content of test_module.py
def test_ehlo(smtp_connection):
    response, msg = smtp_connection.ehlo()
    assert response == 250
    assert b"smtp.gmail.com" in msg

def test_noop(smtp_connection):
    response, msg = smtp_connection.noop()
    assert response == 250
```

##### Phạm vi của shared fixture
Fixture được tạo ra và bị hủy dựa trên phạm vi hoạt động của nó
- function: phạm vi mặc định, fixture bị hũy sau mỗi test.
- class: bị hủy trong lần test cuối cùng của class.
- module: bị hủy trong lần test cuối cùng của module.
- package: bị hủy trong lần test cuối cùng của package.
- session: bị hủy trong lần test cuối cùng của session.

### Clean up fixtures sau khi chạy test

Pytest hỗ trợ việc khởi tạo và clean-up fixtures bằng 2 cách: dùng `yield` và dùng `finalizer`
#### Dùng yield

Xét ví dụ bên dưới
```python
@pytest.fixture
def sending_user(mail_admin):
    user = mail_admin.create_user()
    yield user
    mail_admin.delete_user(user)
```
- Trong giai đoạn khởi tạo, pytest sẽ dừng lại ở đoạn `yield user` tương tự như  `return user`
- Sau khi chạy xong các test, pytest sẽ chạy đoạn code bên dưới `yield` cho từng fixture, ta cần thêm phần cleanup ở đó
<div class="info">
  <p><strong>Info!</strong> Thứ tự cleanup fixture sẽ ngược lại với thứ tự khởi tạo fixture</p>
</div>

### Override fixtures

- Fixtures được cung cấp bới các pluggin khác nhau, có thể override lại fixtures ở file `conftest.py`
Ví dụ

```python
tests/
    conftest.py
    # content of tests/conftest.py
        import pytest
        @pytest.fixture
            def username():
                return 'username'

    test_something.py
        # content of tests/test_something.py
        def test_username(username):
            assert username == 'username'
    subfolder/
        conftest.py
            # content of tests/subfolder/conftest.py
            import pytest
            @pytest.fixture
            def username(username):
                return 'overridden-' + username
        test_something_else.py
            # content of tests/subfolder/test_something_else.py
            def test_username(username):
                assert username == 'overridden-username'
```
- fixture `username` được xây dựng khác nhau ở mỗi level.


#### Dùng finalizer

- Cần thêm param `request` vào cho mỗi fixture muốn dùng cleanup.
- Cần khai báo hàm cleanup và đăng ký hàm này với object `request` thông qua api `addfinalizer`

```python
@pytest.fixture
def receiving_user(mail_admin, request):
    user = mail_admin.create_user()
    def delete_user():
        mail_admin.delete_user(user)
    request.addfinalizer(delete_user)
    return user
```
<div class="warning">
  <p><strong>Warning!</strong> finalizer được gọi lúc khỏi tạo fixture và nếu có lỗi gì trong quá trình thêm này thì test vẫn tiếp tục chạy.</p>
</div>

## Sử dụng marks

- Fixture đã cung cấp khả năng khởi tạo resource cho test rất thành công. Tiếp theo `mark` cung cấp các tùy biến cho các test function bên trong mỗi test file. Sau đây là các ví dụ sử dụng `mark` để  tùy biến cho test function.

### Dùng mark để cung cấp input thay cho fixture

- Sử dụng built-in mark `parametrize` để cung cấp input cho hàm test.
```python
# content of test_expectation.py
import pytest
@pytest.mark.parametrize("test_input,expected", [("3+5", 8), ("2+4", 6), ("6*9", 42)])
def test_eval(test_input, expected):
    assert eval(test_input) == expected
```
- Khai báo toàn cục

```python
import pytest
pytestmark = pytest.mark.parametrize("n,expected", [(1, 2), (3, 4)])
class TestClass:
    def test_simple_case(self, n, expected):
        assert n + 1 == expected
    def test_weird_simple_case(self, n, expected):
        assert (n * 1) + 1 == expected

```
- Matrix

```python
import pytest
@pytest.mark.parametrize("x", [0, 1])
@pytest.mark.parametrize("y", [2, 3])
# Các cặp input được tạo ra: x=0/y=2, x=1/y=2, x=0/y=3, và x=1/y=3
def test_foo(x, y):
    pass

```


### Chỉ chạy test khi mark tồn tại

- Thay vì luôn luôn chạy một test, có thể dùng mark để chỉ chạy một test khi mark name tồn tại.

```python
import pytest

@pytest.fixture
def a_val():
    return 10

def test_answer1(a_val):
    tmp = a_val
    print("a_val", a_val)
    a_val = a_val + 1
    assert a_val == tmp + 12

@pytest.mark.thanhle
def test_answer2(a_val):
    assert a_val == 10

```
- Trong ví dụ trên, pytest sẽ kiểm tra mark name `thanhle` có tồn tại hay không trước khi chạy `test_answer2`.
- Vì mark `thanhle` là một custom mark nên cần khai báo. Cần tạo một file `pytest.ini` tại thư mục cần chạy test, và khai báo custom mark như sau

```yaml
[pytest]
markers =
  thanhle: test mark

```
## Các cấu hình cho pytest

- Các thiết lập cho pytest được ghi ở file `pytest.ini`
- Nếu muốn thay đổi các option trong file này thì có thể overide nó bằng cách dùng option `-o/--override-ini`

```shell
pytest -o console_output_style=classic -o cache_dir=/tmp/mycache

```

```yaml
# content of pytest.ini
[pytest]

# Test file to scan
python_files =
    test_*.py
    check_*.py
    example_*.py

# App options
addopts =
  -s
  --embedded-services esp,idf
  --tb short
  --skip-check-coredump y
  --maxfail=2 -rf # exit after 2 failures, report fail info
console_output_style =
    classic: classic pytest output.
    progress: like classic pytest output, but with a progress indicator
    count: like progress, but shows progress as the number of tests completed instead of a percent
# ignore DeprecationWarning
filterwarnings =
  ignore::DeprecationWarning:matplotlib.*:
  ignore::DeprecationWarning:google.protobuf.*:
  ignore::_pytest.warning_types.PytestExperimentalApiWarning

# log related

log_cli = True # Enable log display during test run (also known as “live logging”). The default is False.
log_cli_level = INFO
log_cli_format = %(asctime)s %(levelname)s %(message)s
log_cli_date_format = %Y-%m-%d %H:%M:%S
log_file = logs/pytest-logs.txt

# junit related
# xunit1 produces old style output, compatible with the xunit 1.0 format
# xunit2 produces xunit 2.0 style output, which should be more compatible with latest Jenkins versions

junit_family = xunit1

## log all to `system-out` when case fail
# log: write only logging captured output.
# system-out: write captured stdout contents.
# system-err: write captured stderr contents.
# out-err: write both captured stdout and stderr contents.
# all: write captured logging, stdout and stderr contents.
# no (the default): no captured output is written.

# Write captured log messages to JUnit report: one of no|log|system-out|system-err|out-err|all
junit_logging = log
# Capture log information for passing tests to JUnit report
junit_log_passing_tests = True


```
## Plugin
- Pytest đã cung cấp một frame work hỗ trợ việc test, tạo các resource cho việc test. Các dự án khác nhau sẽ có các nhu cầu test khác nhau, ví dụ test cho web app, mobile app, embedded, backend, frontend ...
- Plugin giúp tạo công cụ chuyên biệt cho từng loại ứng dụng. Một vài ví dụ

| Tên | Chức năng          |
|:---------|:------------- |
| pytest-django      | write tests for django apps, using pytest integration.   |
| pytest-cov      | coverage reporting, compatible with distributed testing   |
| pytest-embedded      | A pytest plugin that has multiple services available for various functionalities. Designed for embedded testing.|

<div class="success">
  <strong>Info! </strong> Xem thêm bài viết về <a href="pytest-embedded.html"><strong>pytest-embedded</strong></a>
</div>
## Tham khảo
- Reference [docs.pytest.org](https://docs.pytest.org/en/latest/contents.html)
