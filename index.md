---
layout: default
title: Home
---


Trang web này được tạo ra để giúp mình note lại những cái từng làm và đang làm. Ngoài việc giúp mình nhanh chóng tìm lại khi cần thì nó còn giúp kiểm soát tốt hơn tiến độ của các project. Các bài viết được lược kê bên dưới.


### Linux -  networking
### Linux - general

<table class="project_table">
  <thead>
    <tr>
      <th>Hình ảnh</th>
      <th>Bài viết</th>
      <th>Latest commit/release</th>
      <th>Trạng thái</th>
    </tr>
  </thead>
  <tbody>
{% for page in site.linux_general %}
    <tr>
      <td class="page_picture_td">
        {% if page.picture %}
          <a target="_blank" href="{{ page.url }}"><img class="page_table_picture" src="{{ page.picture | image_thumbnail }}" alt="{{ page.title }}"></a>
        {% endif %}
      </td>
      <td>
        <a target="_blank" href="{{ page.url }}"><strong>{{ page.title }}</strong></a>
      </td>
      <td>{{ page.latest_release }}</td>
      <td>{{ page.status }}</td>
    </tr>
{% endfor %}
  </tbody>
</table>







