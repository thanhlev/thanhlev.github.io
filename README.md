# Thanh Le's Technical Blog

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue)](https://thanhlev.github.io/)
[![Jekyll](https://img.shields.io/badge/Jekyll-3.9-red)](https://jekyllrb.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

A professional technical blog focused on Linux systems, embedded development, networking, and DevOps engineering. Visit the live site at [thanhlev.github.io](https://thanhlev.github.io/).

## 🚀 Features

- **Organized Content**: Articles categorized by topics (Linux Networking, Linux General, Embedded Systems, Yocto)
- **Professional Design**: Clean, modern interface with responsive layout
- **SEO Optimized**: Meta tags, sitemap, and structured data for better search visibility
- **Fast Loading**: Static site generation with Jekyll for optimal performance
- **Easy Navigation**: Intuitive menu structure with dropdown navigation

## 📁 Project Structure

```
.
├── _config.yml          # Jekyll configuration
├── _layouts/            # Page layouts
│   └── default.html     # Main layout template
├── _plugins/            # Custom Jekyll plugins
├── assets/              # Static assets
│   ├── css/            # Stylesheets
│   └── images/         # Images and thumbnails
├── pages/              # Content collections
│   ├── _embedded/      # Embedded systems articles
│   ├── _linux_general/ # General Linux topics
│   ├── _linux_networking/ # Networking articles
│   └── _yocto/         # Yocto Project content
├── index.md            # Homepage
├── about.md            # About page
└── 404.html            # Custom 404 page
```

## 🛠️ Technologies Used

- **Jekyll 3.9**: Static site generator
- **GitHub Pages**: Hosting platform
- **Jekyll Theme Slate**: Base theme (customized)
- **Font Awesome**: Icons
- **Kramdown**: Markdown processor

## 🚀 Local Development

### Prerequisites

- Ruby 2.7+
- Bundler
- Git

### Setup

1. Clone the repository:
```bash
git clone https://github.com/thanhlev/thanhlev.github.io.git
cd thanhlev.github.io
```

2. Install dependencies:
```bash
bundle install
```

3. Run the development server:
```bash
bundle exec jekyll serve
```

4. Open your browser and visit `http://localhost:4000`

### Building for Production

```bash
bundle exec jekyll build
```

The generated site will be in the `_site` directory.

## 📝 Adding New Content

### Creating a New Article

1. Choose the appropriate collection directory under `pages/`
2. Create a new Markdown file with front matter:

```markdown
---
layout: default
title: "Your Article Title"
short_description: "Brief description"
status: "In Progress"
picture: "assets/images/your-image.png"
latest_release: "Initial version"
index: 10
publish: true
---

Your content here...
```

### Front Matter Fields

- `layout`: Page layout (usually "default")
- `title`: Article title
- `short_description`: Brief description for listing pages
- `status`: Article status (Done, In Progress, etc.)
- `picture`: Thumbnail image path
- `latest_release`: Version or update info
- `index`: Sort order (lower numbers appear first)
- `publish`: Whether to show in listings

## 🎨 Customization

### Modifying Styles

Edit `assets/css/style.scss` to customize the appearance. The file uses CSS variables for easy theming:

```scss
:root {
  --primary-color: #2c3e50;
  --secondary-color: #3498db;
  --accent-color: #e74c3c;
  // ... more variables
}
```

### Updating Navigation

Edit `_layouts/default.html` to modify the navigation menu structure.

## 📊 Analytics

Google Analytics is configured in `_config.yml`. Update the tracking ID to use your own analytics:

```yaml
google_analytics: YOUR-TRACKING-ID
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

- **Email**: thanhlev@amazon.com.vn | thanhlevvn@gmail.com
- **LinkedIn**: [linkedin.com/in/thanhlev](https://www.linkedin.com/in/thanhlev)
- **GitHub**: [github.com/thanhlev](https://github.com/thanhlev)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Jekyll team for the amazing static site generator
- GitHub Pages for free hosting
- All contributors and readers of the blog

---

Made with ❤️ by Thanh Le