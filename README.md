# Aether CMS

A lightweight, file-based CMS built with vanilla JavaScript and [LiteNode](https://github.com/LebCit/litenode) that generates blazing-fast static sites.

## ✨ Features

### Content Management

-   **File-based storage** - Content stored as Markdown files with YAML frontmatter
-   **Posts & Pages** - Full support for blog posts and static pages
-   **Categories & Tags** - Organize content with taxonomies
-   **Custom Pages** - Create nested page hierarchies with custom templates
-   **Rich Editor** - Built-in Markdown editor with live preview
-   **Media Library** - Upload and manage images and documents

### Theming & Customization

-   **Theme System** - Theme system architecture with template hierarchy
-   **Theme Marketplace** - Install themes directly from GitHub repository
-   **Hook System** - Extensible plugin architecture for developers
-   **Custom Templates** - Support for page-specific templates
-   **Menu Management** - Global navigation menu system

### Performance & SEO

-   **Static Site Generation** - Generate ultra-fast static sites
-   **SEO Optimized** - Automatic sitemap, RSS feeds, and meta tags
-   **Clean URLs** - Beautiful, SEO-friendly URL structure
-   **Image Optimization** - Automatic image metadata and alt text management

### User Management

-   **Role-based Access** - Admin and editor user roles
-   **Secure Authentication** - Argon2 password hashing with rate limiting
-   **Session Management** - Secure session handling

## 🚀 Quick Start

### Prerequisites

-   Node.js 18+
-   npm or yarn

### Installation

1. **Create a new project**

    ```bash
    npx create-aether-cms my-cms-site
    cd my-cms-site
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Start the development server**

    ```bash
    npm start
    ```

4. **Access the admin dashboard**
   Open `http://localhost:8080/aether` in your browser
    - Default credentials: `admin` / `admin`

## 📁 Project Structure

```
aether/
├── content/            # Content storage
│   ├── data/           # Posts, pages, and settings
│   │   ├── posts/      # Blog posts (.md files)
│   │   ├── pages/      # Static pages (.md files)
│   │   └── custom/     # Custom pages (.md files)
│   ├── themes/         # Theme files
│   │   └── default/    # Default theme
│   └── uploads/        # Media files
├── core/               # Core CMS functionality
│   ├── api/            # REST API endpoints
│   ├── lib/            # Core libraries
│   ├── routes/         # Frontend routes
│   └── admin/          # Admin interface
└── assets/             # Static assets
```

## 🎨 Themes

Aether uses a flexible theme system with template hierarchy:

### Template Hierarchy

1. **Custom templates** - `themes/theme-name/custom/page-name.html`
2. **Content-specific** - `themes/theme-name/templates/post.html`
3. **Generic content** - `themes/theme-name/templates/content.html`
4. **Layout fallback** - `themes/theme-name/templates/layout.html`

### Theme Structure

```
theme-name/
├── theme.json           # Theme metadata
├── assets/              # CSS, JS, images
│   ├── css/
│   └── js/
├── templates/           # Core templates
│   ├── layout.html      # Base layout
│   ├── post.html        # Single post
│   ├── page.html        # Single page
│   └── taxonomy.html    # Categories/tags
├── partials/            # Reusable components
└── custom/              # Custom page templates
```

## 📝 Content Management

### Creating Content

**Posts** are stored in `content/data/posts/` as Markdown files:

```markdown
---
id: "1234567890"
title: "My Blog Post"
slug: "my-blog-post"
status: "published"
author: "admin"
category: "Technology"
tags: ["javascript", "cms"]
createdAt: "2024-01-15T10:00:00.000Z"
---

# My Blog Post

This is the content of my blog post written in Markdown.
```

**Custom Pages** support nested hierarchies:

```markdown
---
id: "1234567891"
title: "API Documentation"
slug: "api-docs"
pageType: "custom"
parentPage: "documentation"
status: "published"
---

# API Documentation

Documentation content here...
```

## 🔧 Static Site Generation

Generate a static version of your site:

```bash
# Generate with default settings
npm run build

# Custom output directory
npm run build -- --output dist

# Custom base URL
npm run build -- --base-url https://yourdomain.com

# Disable clean URLs
npm run build -- --no-clean-urls
```

### Configuration Options

-   `--output, -o` - Output directory (default: `_site`)
-   `--base-url, -b` - Base URL for the site
-   `--no-clean-urls` - Use `.html` extensions instead of clean URLs

## 🔌 Hooks & Extensibility

Aether includes a hook system for extensibility:

```javascript
// Add a filter to modify posts
hookSystem.addFilter("api_posts", (posts, req) => {
    // Modify posts data
    return posts.filter((post) => post.featured)
})

// Add an action after post creation
hookSystem.addAction("post_created", (post) => {
    console.log(`New post created: ${post.title}`)
})
```

## 🛠️ Development

### Environment Variables

Create a `.env` file:

```env
PORT=8080
NODE_ENV=development
```

### API Endpoints

#### Content API

-   `GET /api/posts` - List posts
-   `POST /api/posts` - Create post
-   `PUT /api/posts/:id` - Update post
-   `DELETE /api/posts/:id` - Delete post

#### Media API

-   `GET /api/media` - List media files
-   `POST /api/media/upload` - Upload file
-   `DELETE /api/media/:id` - Delete file

#### Theme API

-   `GET /api/themes` - List themes
-   `POST /api/themes/switch/:name` - Switch theme
-   `POST /api/themes/upload` - Upload theme

### File Structure Conventions

-   **Posts**: Use descriptive slugs (`my-awesome-post.md`)
-   **Pages**: Organize by hierarchy (`about.md`, `contact.md`)
-   **Custom Pages**: Use parent-child relationships for nesting

## 🚦 Deployment

### Static Deployment

1. Generate static site: `npm run build`
2. Deploy the `_site` folder to any static host — here are a few common choices:
    - [Azure Static Web Apps](https://azure.microsoft.com/en-us/services/app-service/static/)
    - [Cloudflare Pages](https://pages.cloudflare.com/)
    - [GitHub Pages](https://pages.github.com/)
    - [GitLab Pages](https://about.gitlab.com/product/pages/)
    - [Netlify](https://www.netlify.com/)
    - [Render](https://render.com/)
    - [Surge](https://surge.sh/)
    - [Vercel](https://vercel.com/)

### Node.js Deployment

1. Set `NODE_ENV=production`
2. Configure reverse proxy (nginx/Apache)
3. Use process manager (PM2, forever)

### Environment Configuration

```env
NODE_ENV=production
PORT=3000
```

## 📄 License

This project is licensed under the **[GNU General Public License v3.0 or later (GPL-3.0-or-later)](https://www.gnu.org/licenses/gpl-3.0.html)** - see the [LICENSE](LICENSE) file for details.  
It also uses third-party packages, primarily licensed under the **[MIT License](https://opensource.org/licenses/MIT)** and retrieved via npm.  
Each dependency retains its own license, which can be found in the respective package folders under `node_modules/` after installation.

## 🤝 Contributing

Hi there! 👋
Aether CMS is an open-source project maintained by one person (that's me!), and I want it to be a respectful, inclusive space for everyone.

Please be kind and constructive in all interactions — whether you're opening issues, submitting pull requests, or joining discussions. Disrespectful, abusive, or unhelpful behavior won't be tolerated.

If someone behaves inappropriately, I may block them from the project and report them to GitHub if necessary. Let's keep things friendly and welcoming for everyone!

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Reporting Issues

If you see something off or just need to reach out, feel free to contact me via the [Q&A category](https://github.com/LebCit/aether-cms/discussions/categories/q-a) or by opening a new discussion in the **[Reports category](https://github.com/LebCit/aether-cms/discussions/categories/reports).**

This helps keep our Issues focused on bugs and features.

Thanks for being a good human 💙  
— LebCit

## 📞 Support

-   **Documentation**: [Visit Aether Docs](https://aether-cms.pages.dev/)
-   **Issues**: [Report bugs](https://github.com/lebcit/aether-cms/issues)
-   **Discussions**: [Community forum](https://github.com/lebcit/aether-cms/discussions)

## 🎯 Roadmap

-   Scheduled Publishing
-   Search functionality
-   Advanced user permissions
-   Page caching with duration
-   Plugin system expansion
-   Comment system with moderation
-   Advanced SEO tools
-   Editor enhancements
-   New themes added to the marketplace
-   Simplify update system
-   And that’s just the beginning…

---

**Aether CMS** - Content in Motion. Powered by simplicity.
