---
layout: default
title: "Linux Overlay File System"
short_description: "Linux Overlay File System"
picture: "assets/images/OverlayFS_Image.png"
latest_release: "Init document"
status: "Inprogress"
index: 1
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

## Giới thiệu

Tính năng "phôi phục cài đặt gốc" cần phải ưu tiên và bắt buộc phải có trên các thiết bị có sử dụng firmware/OS. Phương pháp phổ biến hay dùng là trích một phần của bộ nhớ để chứa một bản image "gốc". Khi cần thực hiện factory reset, chỉ cần copy image "gốc" sang phân vùng đang chạy.

Giải pháp ở trên có  một chút lãng phí do phân vùng để chứa image "gốc" ít được sử dụng, hoặc có thể không bao giờ được dùng đến. Do đó "overlay" file system được ra đời nhằm tận dụng image gốc này trong quá trình sử dụng.

## Nguyên tắc hoạt động

<div class="row">
    <div class="column">
    <p>Overlay-filesystem là kết quả của việc overlaying một filesystem trên một filesystem khác. Như ở hình bên, Lower có thể  là factory image và là filesytem chỉ  có thể đọc. Upper là file system có thể đọc/ghi.<br><br>
Kernel thực hiện overlay 2 loại file system này và cung cấp 1 file system mới để làm rootfs cho user-space. Một file/folder mà user nhìn thấy trên overlay file system thực chất được lưu trữ trên Lower file system hoặc Upper file system <br><br>
Ví dụ trong suốt quá trình sử dụng, user chỉ đọc 1 file mà không có nhu cầu chỉnh sữa, file này hoàn toàn có thể lấy trực tiếp từ Lower. Khi có chỉnh sửa file, một bản copy được tạo ra trên Upper file system để hỗ trợ việc ghi dữ liệu.<br><br>
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

