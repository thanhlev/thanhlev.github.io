---
layout: default
title: "Linux Overlay File System"
short_description: "Ghi chép của mình về overlayfs: lower/upper, whiteout, và factory reset bằng cách xoá upper"
picture: "assets/images/OverlayFS_Image.png"
latest_release: "Init document"
status: "In Progress"
index: 3
publish: true
---

# Linux Overlay File System
{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------
## Revision history

| Revision | Date          | Remark      |
|:---------|:------------- |:------------|
| 0.1      | Feb-27-2023   | {{page.latest_release}}|

## Introduction

Mình đọc về overlayfs vì chuyện "khôi phục cài đặt gốc" (factory reset): thiết bị nào chạy firmware/OS cũng gần như bắt buộc phải có. Cách hay gặp là chừa một phần bộ nhớ để chứa một bản image "gốc"; khi cần factory reset thì copy image "gốc" đó sang phân vùng đang chạy.

Mình thấy cách này hơi phí: phân vùng chứa image "gốc" gần như nằm không, có khi cả đời máy không dùng tới. Overlay file system giải quyết đúng chỗ đó: tận dụng luôn image gốc trong lúc máy chạy bình thường.

## Nguyên tắc hoạt động

<div class="row">
    <div class="column">
    <p>Overlay-filesystem là kết quả của việc overlaying một filesystem trên một filesystem khác. Như ở hình bên, Lower có thể  là factory image và là filesytem chỉ  có thể đọc. Upper là file system có thể đọc/ghi.<br><br>
Kernel thực hiện overlay 2 loại file system này và cung cấp 1 file system mới để làm rootfs cho user-space. Một file/folder mà user nhìn thấy trên overlay file system thực chất được lưu trữ trên Lower file system hoặc Upper file system <br><br>
Ví dụ, trong suốt quá trình sử dụng, nếu user chỉ đọc một file mà không sửa thì file đó được lấy thẳng từ Lower. Khi sửa file, kernel tạo một bản copy trên Upper rồi ghi vào bản copy đó (copy-up).<br><br>
Bằng cách sử dụng kỹ thuật overlay, rõ ràng ta đã có thể tận dụng được "factory image" bằng cách dùng các file read-only của nó. Cách này cũng giúp giảm dung lượng cho Upper file system do không phải copy toàn bộ những file read-only đó.</p>
  </div><div class="column">
        <img  src="./../../../assets/images/OverlayFS_Image.png" width="100%" height="100%">
    </div>

</div>

## Upper và Lower file system

Một overlay filesystem kết hợp 2 filesystems -  một upper filesystem và một lower filesystems. Khi một cái tên tồn tại trên cả hai filesystems, đối tượng trong upper filesystems sẽ được chọn và object trong lower sẽ bị ẩn nếu đối tượng là file.

Trong trường hợp thư mục, kernel sẽ thực hiện việc merge cả 2 thư mục, khi gặp file thì áp dụng nguyên tắc ở trên.
Nếu overlay cuối cùng là một read-only thì 2 filesystem cấu thành nên nó có thể chọn từ bất kì filesystem nào.

## Whiteouts and opaque directories
Để hổ trợ việc xóa file và xóa thư mục mà không ảnh hưởng đến lower file system, một overlay filesystem cần phải record lại trên upper filesystem rằng file đã bị xóa. Nó thực hiện bằng việc đánh dấu whiteouts và opaque thư mục (nếu không phải là thư mục thì luôn là opaque)

Một whiteouts được tạo ra như một character device với device number là 0/0. Khi một whiteout được tìm thấy ở thư mục merge, các matching name ở lower level bị bỏ qua, và whiteout củng bị ẩn đi.

Một thư mục được đánh dấu opaque bằng cách set thuộc tính xattr “trusted.overlay.opaque” = y. Nếu upper filesystem chứa một thư mục opaque, thư mục tương ứng ở lower filesystem sẽ bị bỏ qua.

## Factory reset
Factory reset thực hiện đơn giản bằng cách xóa toàn bộ dữ liệu trên Upper file system

## Còn thiếu

Bài này mới là phần lý thuyết mình đọc từ tài liệu kernel. Chưa có ví dụ `mount -t overlay` chạy thật trên board, nên mình để trạng thái "In Progress".

## Reference

- [https://docs.kernel.org/filesystems/overlayfs.html](https://docs.kernel.org/filesystems/overlayfs.html)
