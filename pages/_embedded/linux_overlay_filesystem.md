---
layout: default
title: "Linux Overlay File System"
short_description: "Ghi chép của mình về overlayfs: lower/upper, whiteout, và factory reset bằng cách xoá upper"
picture: "assets/images/OverlayFS_Image.png"
latest_release: "2026-11-22: viết lại theo dạng STAR"
status: "In Progress"
index: 3
publish: true
---

<!-- 2026-11-22: rewritten in STAR form (user «hãy viết lại tất cả các trang theo chuẩn STAR»).
     Cùng nội dung lý thuyết như trước, không thêm số liệu hay lệnh chưa chạy. -->

# Linux Overlay File System
{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

---

## Situation

Mình đọc về overlayfs vì chuyện "khôi phục cài đặt gốc" (factory reset): thiết bị nào chạy firmware/OS
cũng gần như bắt buộc phải có. Cách hay gặp là chừa một phần bộ nhớ để chứa một bản image "gốc"; khi cần
factory reset thì copy image "gốc" đó sang phân vùng đang chạy.

Mình thấy cách này hơi phí: phân vùng chứa image "gốc" gần như nằm không, có khi cả đời máy không dùng tới.

## Task

Hiểu overlayfs đủ để trả lời một câu: có dùng luôn image gốc trong lúc máy chạy bình thường được không,
và nếu được thì factory reset còn lại là làm gì.

## Action

Mình đọc tài liệu overlayfs của kernel ([docs.kernel.org/filesystems/overlayfs.html](https://docs.kernel.org/filesystems/overlayfs.html)).
Những gì rút ra được:

### Nguyên tắc hoạt động

<div class="row">
    <div class="column">
    <p>Overlay filesystem là kết quả của việc chồng (overlay) một filesystem lên một filesystem khác. Như ở hình bên, Lower có thể là factory image và chỉ đọc được. Upper là filesystem đọc/ghi được.<br><br>
Kernel chồng 2 filesystem này lên nhau và đưa ra một filesystem mới làm rootfs cho user-space. Một file/folder mà user nhìn thấy trên overlay thực chất nằm trên Lower hoặc trên Upper.<br><br>
Ví dụ, nếu user chỉ đọc một file mà không sửa thì file đó được lấy thẳng từ Lower. Khi sửa file, kernel tạo một bản copy trên Upper rồi ghi vào bản copy đó (copy-up).<br><br>
Vậy là image gốc được dùng luôn, qua các file read-only của nó. Upper cũng nhỏ hơn, vì không phải copy toàn bộ những file chỉ đọc đó.</p>
  </div><div class="column">
        <img  src="./../../../assets/images/OverlayFS_Image.png" width="100%" height="100%">
    </div>

</div>

### Upper và Lower

Một overlay kết hợp 2 filesystem: một upper và một lower. Khi một cái tên có ở cả hai, đối tượng trên
upper được chọn, và nếu đó là file thì đối tượng ở lower bị ẩn đi.

Với thư mục thì kernel merge cả hai thư mục lại; gặp file bên trong thì áp dụng nguyên tắc ở trên.
Nếu overlay cuối cùng là read-only thì hai filesystem tạo nên nó có thể là bất kì filesystem nào.

### Whiteout và opaque directory

Để xoá được file và thư mục mà không đụng tới lower, overlay phải ghi lại trên upper rằng file đó đã bị
xoá. Nó làm việc này bằng whiteout và bằng cách đánh dấu thư mục opaque (nếu không phải thư mục thì luôn
được coi là opaque).

Whiteout là một character device với device number 0/0. Khi gặp whiteout trong thư mục đã merge, những
tên trùng ở lower bị bỏ qua, và chính whiteout cũng bị ẩn đi.

Thư mục được đánh dấu opaque bằng xattr `trusted.overlay.opaque` = `y`. Nếu upper có một thư mục opaque,
thư mục tương ứng ở lower bị bỏ qua.

## Result

Câu trả lời là được: lower là image gốc chỉ đọc, dùng hằng ngày như rootfs; mọi thay đổi (kể cả xoá, nhờ
whiteout) nằm trên upper. Factory reset khi đó chỉ là xoá toàn bộ dữ liệu trên upper, không cần phân vùng
dự phòng nằm không nữa.

Bài này mới là phần lý thuyết mình đọc từ tài liệu kernel. Mình chưa chạy `mount -t overlay` trên board,
nên để trạng thái "In Progress".

## What I'd do next

Dựng thử trên một board: lower là một squashfs chỉ đọc, upper là một phân vùng ghi được, sửa vài file, xoá
một file để xem whiteout nằm trên upper ra sao, rồi xoá upper và xem máy về lại trạng thái gốc.

## Reference

- [https://docs.kernel.org/filesystems/overlayfs.html](https://docs.kernel.org/filesystems/overlayfs.html)
