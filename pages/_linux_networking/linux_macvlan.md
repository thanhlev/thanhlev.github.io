---
layout: default
title: "Linux MacVLAN"
short_description: "Thông tin về  macvlan interface trên Linux"
status: "Done"
picture: "assets/images/linux-macvlan.png"
latest_release: "Initialize document"
index: 3
publish: true
---

# Linux MacVLAN interface
{: .no_toc }

## Table of contents
{: .no_toc }

1. TOC
{:toc}

-----------------------------------
## Revision history

| Revision | Date        | Remark                  |
| :------- | :---------- | :---------------------- |
| 0.1      | Jan-12-2023 | {{page.latest_release}} |

## Định nghĩa

<div class="row">
    <div class="column">
        <img src="./../../assets/images/linux-macvlan.png" alt="Girl in a jacket">
    </div>
    <div class="column">
    <p>- Macvlan là một soft interface ảo hoạt động ở layer 2, là một sub-interface được tạo ra từ một interface vật lý.<br>
- Network stack của Kernel sẽ tạo ra một interface có địa chỉ MAC khác với địa chỉ MAC của interface vật lý.<br>
- Interface vật lý cần phải hỗ trợ mode `promiscuity` để  hỗ trợ truyền nhận các gói tin có địa chỉ MAC nguồn và đích khác với địa chỉ MAC của interface vật lý.<br>
- Kernel sẽ định tuyến  các gói tin giữa interface ảo và interface vật lý dựa trên địa chỉ MAC trong ethernet frame.</p>
  </div>

</div>


## Các mode hoạt động của macvlan interfaces

### Macvlan private

<div class="row">
  <div class="column">
    <img src="../../../assets/images/linux-macvlan-private.png" alt="Girl in a jacket">
  </div>
  <div class="column">
    <p>- Ở mode này các sub-interface không giao tiếp được với nhau, nghĩa là Kernel không định tuyến gói tin dựa trên MAC để chuyển đến sub-interface tương ứng.<br>
- Tất cả data đều được đưa đến physical interface để truyền ra ngoài.</p>
  </div>
</div>


### Macvlan VEPA

<div class="row">
  <div class="column">
    <img src="../../../assets/images/linux-macvlan-vepa.png" alt="Girl in a jacket">
  </div>
  <div class="column">
    <p>- Ở mode này, ethernet frame được chèn thêm dữ liệu chuyên biệt. Và cần một Switch ở đầu cuối có hỗ trợ VEPA để forward gói tin ngược trở lại interface vật lý.</p>
  </div>
</div>


### Macvlan bridge

<div class="row">
  <div class="column">
    <img src="../../../assets/images/linux-macvlan-bridge.png" alt="Girl in a jacket">
  </div>
   <div class="column">
    <p><br><br><br>- Ở mode này , các package đi giữa các sub-interface với nhau sẽ được gửi nội bộ thông qua một bridge đơn giản.<br>
- Các broadcast traffic sẽ được gửi nội bộ giữa các sub-interface lẫn gửi ra ngoài bằng interface vật lý.<br></p>
  </div>
</div>

### Macvlan passthrough

<div class="row">
    <div class="column">
    <img src="../../../assets/images/linux-macvlan-passthrough.png" alt="Girl in a jacket">
  </div>
  <div class="column">
    <p>- Ở mode này chúng ta chỉ tạo ra một sub-interface và cho nó kết nối trực tiếp vào physical interface. Băng cách này chúng  ta có thể thay đổi mac address cũng như các tham số interface khác trong máy ảo mà không làm ảnh hưởng đến interface chính.</p>
  </div>

</div>


## Nhược điểm của macvlan

- Giả sử một sub-interface (VM) muốn giao tiếp với parent interface (host), VM sẽ gửi dest MAC là MAC của host interface, Kernel truyền gói này đến  parent interface và truyền ra ngoài đi đến switch. Switch lúc này không thể  loop back lại chính interface mà nó vừa nhận dẫn đến một giới hạn khi sử dụng macvlan là VM không thể giao tiếp với host và ngược lại.


## Cách tạo macvlan interface
Xem bài <a target="_blank" href="virtual_interface.html">Linux Virtual Interfaces</a>
