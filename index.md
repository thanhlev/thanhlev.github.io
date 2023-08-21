---
layout: default
title: Home
---


Trang web này được tạo ra để giúp mình note lại những cái từng làm và đang làm. Ngoài việc giúp mình nhanh chóng tìm lại khi cần thì nó còn giúp kiểm soát tốt hơn tiến độ của các project. Các bài viết được liệt kê bên dưới.


### Linux -  networking

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
{% assign sorted = site.linux_networking | sort: 'index' %}
{% for page in sorted %}
    {% if page.publish %}
      <tr>
        <td class="page_picture_td">
          {% if page.picture %}
            <a  href="{{ page.url }}"><img class="page_table_picture" src="{{ page.picture | image_thumbnail }}" alt="{{ page.title }}"></a>
          {% endif %}
        </td>
        <td>
          <a  href="{{ page.url }}"><strong>{{ page.title }}</strong></a><br>
          (<a  href="{{ page.url }}">{{ page.short_description }}</a>)
        </td>
        <td>{{ page.latest_release }}</td>
        <td>{{ page.status }}</td>
      </tr>
    {% endif %}
{% endfor %}
  </tbody>
</table>


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
{% assign sorted = site.linux_general | sort: 'index' %}
{% for page in sorted %}
    <tr>
      <td class="page_picture_td">
        {% if page.picture %}
          <a  href="{{ page.url }}"><img class="page_table_picture" src="{{ page.picture | image_thumbnail }}" alt="{{ page.title }}"></a>
        {% endif %}
      </td>
      <td>
        <a  href="{{ page.url }}"><strong>{{ page.title }}</strong></a><br>
        (<a  href="{{ page.url }}">{{ page.short_description }}</a>)
      </td>
      <td>{{ page.latest_release }}</td>
      <td>{{ page.status }}</td>
    </tr>
{% endfor %}
  </tbody>
</table>

### Embedded

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
{% assign sorted = site.embedded | sort: 'index' %}
{% for page in sorted %}
    <tr>
      <td class="page_picture_td">
        {% if page.picture %}
          <a  href="{{ page.url }}"><img class="page_table_picture" src="{{ page.picture | image_thumbnail }}" alt="{{ page.title }}"></a>
        {% endif %}
      </td>
      <td>
        <a  href="{{ page.url }}"><strong>{{ page.title }}</strong></a><br>
        (<a  href="{{ page.url }}">{{ page.short_description }}</a>)
      </td>
      <td>{{ page.latest_release }}</td>
      <td>{{ page.status }}</td>
    </tr>
{% endfor %}
  </tbody>
</table>





