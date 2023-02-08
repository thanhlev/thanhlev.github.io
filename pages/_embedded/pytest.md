---
layout: default
title: "Pytest"
short_description: "Pytest và cách sử dụng"
picture: "assets/images/pytest_diagram.png"
latest_release: "Init document"
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
| 0.1      | Feb-07-2023   | {{page.latest_release}}|

## Giới thiệu

- Pytest là một công cụ test code miễn phí được cộng đồng phát triển.
- Với các plugins mở rộng, được dùng cho các công CI để test tự động.

## Hoạt động

### Ví dụ

- tạo file test: `test_sample.py`

```python
# content of demo/test_sample.py
def sumOf(a,b):
    return x + 1


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

## Tham khảo
- Reference [docs.pytest.org](https://docs.pytest.org/en/latest/contents.html)
