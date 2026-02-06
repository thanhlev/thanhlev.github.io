---
layout: default
title: Home
---

# Welcome to My Technical Blog

I'm Thanh Le, a software engineer specializing in Linux systems, embedded development, networking, and DevOps. This blog serves as my knowledge base where I document technical solutions, share insights, and track project progress.

## Featured Topics

### 🌐 Linux Networking

Explore advanced networking concepts, Docker networking, virtual interfaces, and network management solutions.

<table class="project_table">
  <thead>
    <tr>
      <th>Preview</th>
      <th>Article</th>
      <th>Last Updated</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
{% assign sorted = site.linux_networking | sort: 'index' %}
{% for page in sorted %}
    {% if page.publish %}
      <tr>
        <td class="page_picture_td">
          {% if page.picture %}
            <a href="{{ page.url }}"><img class="page_table_picture" src="{{ page.picture | image_thumbnail }}" alt="{{ page.title }}"></a>
          {% endif %}
        </td>
        <td>
          <a href="{{ page.url }}"><strong>{{ page.title }}</strong></a><br>
          <span class="article-description">{{ page.short_description }}</span>
        </td>
        <td>{{ page.latest_release }}</td>
        <td><span class="status-badge status-{{ page.status | downcase | replace: ' ', '-' }}">{{ page.status }}</span></td>
      </tr>
    {% endif %}
{% endfor %}
  </tbody>
</table>

### 💻 Linux General

System administration, Docker, development tools, and Linux tips & tricks.

<table class="project_table">
  <thead>
    <tr>
      <th>Preview</th>
      <th>Article</th>
      <th>Last Updated</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
{% assign sorted = site.linux_general | sort: 'index' %}
{% for page in sorted %}
    <tr>
      <td class="page_picture_td">
        {% if page.picture %}
          <a href="{{ page.url }}"><img class="page_table_picture" src="{{ page.picture | image_thumbnail }}" alt="{{ page.title }}"></a>
        {% endif %}
      </td>
      <td>
        <a href="{{ page.url }}"><strong>{{ page.title }}</strong></a><br>
        <span class="article-description">{{ page.short_description }}</span>
      </td>
      <td>{{ page.latest_release }}</td>
      <td><span class="status-badge status-{{ page.status | downcase | replace: ' ', '-' }}">{{ page.status }}</span></td>
    </tr>
{% endfor %}
  </tbody>
</table>

### 🔧 Embedded Systems

Hardware development, microcontrollers, IoT devices, and embedded Linux.

<table class="project_table">
  <thead>
    <tr>
      <th>Preview</th>
      <th>Article</th>
      <th>Last Updated</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
{% assign sorted = site.embedded | sort: 'index' %}
{% for page in sorted %}
    <tr>
      <td class="page_picture_td">
        {% if page.picture %}
          <a href="{{ page.url }}"><img class="page_table_picture" src="{{ page.picture | image_thumbnail }}" alt="{{ page.title }}"></a>
        {% endif %}
      </td>
      <td>
        <a href="{{ page.url }}"><strong>{{ page.title }}</strong></a><br>
        <span class="article-description">{{ page.short_description }}</span>
      </td>
      <td>{{ page.latest_release }}</td>
      <td><span class="status-badge status-{{ page.status | downcase | replace: ' ', '-' }}">{{ page.status }}</span></td>
    </tr>
{% endfor %}
  </tbody>
</table>

### 🏗️ Yocto Project

{% assign yocto_pages = site.yocto | where_exp: "item", "item.publish != false" %}
{% if yocto_pages.size > 0 %}
<table class="project_table">
  <thead>
    <tr>
      <th>Preview</th>
      <th>Article</th>
      <th>Last Updated</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
{% assign sorted = site.yocto | sort: 'index' %}
{% for page in sorted %}
    {% if page.publish != false %}
      <tr>
        <td class="page_picture_td">
          {% if page.picture %}
            <a href="{{ page.url }}"><img class="page_table_picture" src="{{ page.picture | image_thumbnail }}" alt="{{ page.title }}"></a>
          {% endif %}
        </td>
        <td>
          <a href="{{ page.url }}"><strong>{{ page.title }}</strong></a><br>
          <span class="article-description">{{ page.short_description }}</span>
        </td>
        <td>{{ page.latest_release }}</td>
        <td><span class="status-badge status-{{ page.status | downcase | replace: ' ', '-' }}">{{ page.status }}</span></td>
      </tr>
    {% endif %}
{% endfor %}
  </tbody>
</table>
{% else %}
<p class="coming-soon">Content coming soon...</p>
{% endif %}

---

## Recent Updates

Stay tuned for more technical articles and project documentation. Feel free to reach out if you have questions or suggestions!

