import { resolveTemplatePath } from "./template-utils.js"

/**
 * SEO utilities for generating RSS and sitemap files with intelligent sitemap detection
 * Used by both the dynamic routes and static site generator
 * Handles diverse site architectures: blogs, documentation, education sites, etc.
 */

/**
 * Analyzes the site structure to determine what sections should be included in sitemaps
 * @param {Object} options - Analysis options
 * @param {Array} options.posts - Array of posts
 * @param {Array} options.pages - Array of pages
 * @param {Object} options.themeManager - Theme manager instance
 * @returns {Promise<Object>} Site structure analysis
 */
async function analyzeSiteStructure({ posts, pages, themeManager }) {
    const analysis = {
        hasPosts: posts && posts.length > 0,
        hasPages: false,
        hasCategories: false,
        hasTags: false,
        blogIndexPage: null,
        categoriesIndexPage: null,
        tagsIndexPage: null,
        customPagesWithoutTemplates: [],
        nestedCustomPages: new Map(), // slug -> full path info
    }

    // Analyze posts for categories and tags
    if (analysis.hasPosts) {
        const categories = new Set()
        const tags = new Set()

        posts.forEach((post) => {
            if (post.frontmatter.category) {
                categories.add(post.frontmatter.category)
            }
            if (post.frontmatter.tags) {
                const tagArray = Array.isArray(post.frontmatter.tags)
                    ? post.frontmatter.tags
                    : typeof post.frontmatter.tags === "string"
                    ? post.frontmatter.tags.split(",").map((t) => t.trim())
                    : []
                tagArray.forEach((tag) => {
                    if (tag) tags.add(tag)
                })
            }
        })

        analysis.hasCategories = categories.size > 0
        analysis.hasTags = tags.size > 0
    }

    // Analyze pages
    if (pages && pages.length > 0) {
        analysis.hasPages = true

        // Check for blog index pages
        const paginatedTemplates = ["blog", "archive", "articles", "news"]
        for (const template of paginatedTemplates) {
            const blogPage = pages.find(
                (page) =>
                    page.frontmatter.slug === template &&
                    page.frontmatter.pageType === "custom" &&
                    page.frontmatter.status === "published"
            )
            if (blogPage) {
                analysis.blogIndexPage = {
                    slug: template,
                    title: blogPage.frontmatter.title || template.charAt(0).toUpperCase() + template.slice(1),
                }
                break
            }
        }

        // Check for categories and tags index pages
        const categoriesPage = pages.find(
            (page) =>
                page.frontmatter.slug === "categories" &&
                page.frontmatter.pageType === "custom" &&
                page.frontmatter.status === "published"
        )
        if (categoriesPage) {
            analysis.categoriesIndexPage = {
                slug: "categories",
                title: categoriesPage.frontmatter.title || "Categories",
            }
        }

        const tagsPage = pages.find(
            (page) =>
                page.frontmatter.slug === "tags" &&
                page.frontmatter.pageType === "custom" &&
                page.frontmatter.status === "published"
        )
        if (tagsPage) {
            analysis.tagsIndexPage = {
                slug: "tags",
                title: tagsPage.frontmatter.title || "Tags",
            }
        }

        // Analyze custom pages for template existence and nesting
        const customPages = pages.filter(
            (page) => page.frontmatter.pageType === "custom" && page.frontmatter.status === "published"
        )

        // Build parent-child relationships
        const pagesBySlug = new Map()
        customPages.forEach((page) => {
            pagesBySlug.set(page.frontmatter.slug, page)
        })

        for (const page of customPages) {
            const slug = page.frontmatter.slug

            // Skip special pages we've already handled
            if (
                ["homepage", "categories", "tags", "category", "tag"].includes(slug) ||
                slug.startsWith("category-") ||
                slug.startsWith("tag-") ||
                (analysis.blogIndexPage && slug === analysis.blogIndexPage.slug)
            ) {
                continue
            }

            // Check if page has a custom template
            let hasTemplate = false
            if (themeManager) {
                try {
                    const templatePath = await resolveTemplatePath({
                        themeManager,
                        contentType: "custom",
                        slug: slug,
                        isCustomPage: true,
                    })
                    hasTemplate = templatePath !== themeManager.getTemplatePath("layout.html")
                } catch (error) {
                    console.warn(`Error checking template for ${slug}:`, error)
                }
            }

            // Build full path for nested pages
            let fullPath = slug
            let pathParts = [slug]

            if (page.frontmatter.parentPage) {
                const parentChain = []
                let currentPage = page

                // Build parent chain
                while (currentPage.frontmatter.parentPage) {
                    const parent = pagesBySlug.get(currentPage.frontmatter.parentPage)
                    if (!parent) break
                    parentChain.unshift(parent.frontmatter.slug)
                    currentPage = parent
                }

                if (parentChain.length > 0) {
                    pathParts = [...parentChain, slug]
                    fullPath = pathParts.join("/")
                }
            }

            const pageInfo = {
                page,
                fullPath,
                pathParts,
                hasTemplate,
                isNested: page.frontmatter.parentPage ? true : false,
                parentSlug: page.frontmatter.parentPage || null,
            }

            if (!hasTemplate) {
                analysis.customPagesWithoutTemplates.push(pageInfo)
            }

            analysis.nestedCustomPages.set(slug, pageInfo)
        }
    }

    // Check for categories and tags templates
    analysis.hasCategoriesTemplate = false
    analysis.hasTagsTemplate = false

    if (themeManager) {
        try {
            // Check for categories.html template
            const categoriesTemplatePath = await resolveTemplatePath({
                themeManager,
                contentType: "custom",
                slug: "categories",
                isCustomPage: true,
            })
            analysis.hasCategoriesTemplate = categoriesTemplatePath !== themeManager.getTemplatePath("layout.html")

            // Check for tags.html template
            const tagsTemplatePath = await resolveTemplatePath({
                themeManager,
                contentType: "custom",
                slug: "tags",
                isCustomPage: true,
            })
            analysis.hasTagsTemplate = tagsTemplatePath !== themeManager.getTemplatePath("layout.html")
        } catch (error) {
            console.warn("Error checking for categories/tags templates:", error)
        }
    }

    return analysis
}

/**
 * Generates an RSS feed XML string for the site (only if posts exist)
 */
export async function generateRssXml({ posts, siteSettings, baseUrl, contentManager, themeManager, isStatic = false }) {
    // Don't generate RSS if no posts
    if (!posts || posts.length === 0) {
        return null
    }

    // Ensure baseUrl has no trailing slash
    baseUrl = baseUrl.replace(/\/$/, "")

    // Generate XML for each post
    function generatePostXml(post) {
        // Extract frontmatter data
        const { title, slug, excerpt, tags, category, createdAt, updatedAt, author, featuredImage } = post.frontmatter

        // Format publication date (fallback to createdAt if not available)
        const pubDate = new Date(createdAt).toUTCString()

        // Helper function to generate URLs
        const generateUrl = (path) => `${baseUrl}${path}`

        // Generate XML for categories/tags
        let categoriesXml = ""

        // Handle category if available
        if (category) {
            categoriesXml += `<category domain="${generateUrl(
                "/category/" + contentManager.slugify(category)
            )}">${category}</category>\n`
        }

        // Handle tags if available
        if (tags) {
            // Tags might be a string or array - handle both cases
            const tagArray = Array.isArray(tags)
                ? tags
                : typeof tags === "string"
                ? tags.split(",").map((t) => t.trim())
                : []

            tagArray.forEach((tag) => {
                if (tag) {
                    categoriesXml += `        <category domain="${generateUrl(
                        "/tag/" + contentManager.slugify(tag)
                    )}">${tag}</category>\n`
                }
            })
        }

        // Generate description - use excerpt if available, or truncate content
        let description = excerpt || ""
        if (!description && post.content) {
            // Simple truncation for description (first 160 chars)
            description =
                post.content
                    .replace(/<[^>]*>/g, "") // Remove HTML tags
                    .substring(0, 160)
                    .trim() + "..."
        }

        // Properly encode entities in description
        const encodedDescription = description
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;")

        // Include featured image if available
        let imageXml = ""
        if (featuredImage && featuredImage.url) {
            const mimeType = getMimeTypeFromUrl(featuredImage.url)
            imageXml = `        <enclosure url="${generateUrl(
                "/content/uploads" + featuredImage.url
            )}" type="${mimeType}" />\n`
        }

        // Return the formatted item XML
        return `
    <item>
        <title>${title}</title>
        <link>${generateUrl("/post/" + slug)}</link>
        <guid isPermaLink="true">${generateUrl("/post/" + slug)}</guid>
        <pubDate>${pubDate}</pubDate>
        <dc:creator>${author || "Admin"}</dc:creator>
        <description><![CDATA[${encodedDescription}]]></description>
${categoriesXml}${imageXml}    </item>`
    }

    // Join all post items
    const itemsXml = posts.map(generatePostXml).join("\n")

    // Get current date for lastBuildDate
    const lastBuildDate = new Date().toUTCString()

    // Use the first post's date as pubDate, or current date if no posts
    const pubDate = posts.length > 0 ? new Date(posts[0].frontmatter.createdAt).toUTCString() : lastBuildDate

    // Modified part for stylesheet path
    let stylesheetPath

    if (isStatic && themeManager) {
        // For static site, reference the theme-specific path
        const activeTheme = themeManager.getActiveTheme()
        stylesheetPath = `/content/themes/${activeTheme.name}/assets/css/rss-stylesheet.xsl`
    } else {
        // For dynamic site, use common path
        stylesheetPath = "/assets/css/rss-stylesheet.xsl"
    }

    // Generate the complete XML document
    return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="${stylesheetPath}"?>
<rss version="2.0" 
    xmlns:atom="http://www.w3.org/2005/Atom"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:content="http://purl.org/rss/1.0/modules/content/">
    <channel>
        <!-- Channel Information -->
        <title>${siteSettings.siteTitle || "Blog"}</title>
        <link>${baseUrl ? baseUrl : "/"}</link>
        <description>${siteSettings.siteDescription || "Blog Description"}</description>
        <language>${siteSettings.rssSiteLanguage || "en-us"}</language>
        <copyright>${siteSettings.rssCopyright || `© ${new Date().getFullYear()} All rights reserved`}</copyright>
        <pubDate>${pubDate}</pubDate>
        <lastBuildDate>${lastBuildDate}</lastBuildDate>
        <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
        <docs>https://www.rssboard.org/rss-specification</docs>
       
        <!-- Items (Content) -->
${itemsXml}
    </channel>
</rss>`
}

/**
 * Generates a sitemap XML string for the site
 * @param {Object} options - Options for sitemap generation
 * @param {Array} options.posts - Array of posts
 * @param {Array} options.pages - Array of pages
 * @param {Object} options.siteSettings - Site settings object
 * @param {string} options.baseUrl - Base URL for the site
 * @param {Object} options.contentManager - Content manager instance (for slugify)
 * @param {Object} options.themeManager - Theme manager instance
 * @returns {string} The sitemap XML content
 */
export async function generateSitemapXml({ posts, pages, siteSettings, baseUrl, contentManager, themeManager }) {
    // Ensure baseUrl has no trailing slash
    baseUrl = baseUrl.replace(/\/$/, "")

    // Analyze site structure
    const analysis = await analyzeSiteStructure({ posts, pages, themeManager })

    const urls = [
        {
            loc: baseUrl,
            lastmod: new Date().toISOString(),
            priority: "1.0",
            changefreq: "daily",
        },
    ]

    // Add posts if they exist
    if (analysis.hasPosts) {
        for (const post of posts) {
            if (post.frontmatter && post.frontmatter.slug) {
                urls.push({
                    loc: `${baseUrl}/post/${post.frontmatter.slug}`,
                    lastmod: post.frontmatter.updatedAt || post.frontmatter.createdAt,
                    priority: "0.8",
                    changefreq: "weekly",
                })
            }
        }
    }

    // Add pages (including custom pages with proper path resolution)
    if (analysis.hasPages) {
        for (const [slug, pageInfo] of analysis.nestedCustomPages.entries()) {
            const { page, fullPath, hasTemplate } = pageInfo

            // Skip pages without templates that aren't nested under a parent with a template
            if (!hasTemplate && pageInfo.isNested) {
                // Check if any parent has a template
                let hasParentWithTemplate = false
                let currentSlug = pageInfo.parentSlug

                while (currentSlug) {
                    const parentInfo = analysis.nestedCustomPages.get(currentSlug)
                    if (parentInfo?.hasTemplate) {
                        hasParentWithTemplate = true
                        break
                    }
                    currentSlug = parentInfo?.parentSlug
                }

                // Skip if no parent with template
                if (!hasParentWithTemplate) {
                    console.warn(`Custom page ${slug} and its parents have no templates, skipping from XML sitemap...`)
                    continue
                }
            } else if (!hasTemplate && !pageInfo.isNested) {
                // Skip standalone pages without templates
                console.warn(`Custom page ${slug} has no template, skipping from XML sitemap...`)
                continue
            }

            // Determine the URL based on page type
            const pageUrl =
                page.frontmatter.pageType === "custom"
                    ? `${baseUrl}/${fullPath}`
                    : `${baseUrl}/page/${page.frontmatter.slug}`

            urls.push({
                loc: pageUrl,
                lastmod: new Date(page.frontmatter.updatedAt || page.frontmatter.createdAt).toISOString(),
                priority: page.frontmatter.pageType === "custom" ? "0.6" : "0.7",
                changefreq: "monthly",
            })
        }

        // Add regular pages (non-custom)
        const regularPages = pages.filter(
            (page) => page.frontmatter.pageType !== "custom" && page.frontmatter.status === "published"
        )

        for (const page of regularPages) {
            if (page.frontmatter && page.frontmatter.slug) {
                urls.push({
                    loc: `${baseUrl}/page/${page.frontmatter.slug}`,
                    lastmod: new Date(page.frontmatter.updatedAt || page.frontmatter.createdAt).toISOString(),
                    priority: "0.7",
                    changefreq: "monthly",
                })
            }
        }
    }

    // Add category pages only if they exist and have content
    if (analysis.hasPosts && analysis.hasCategories) {
        const categories = new Set()
        posts.forEach((post) => {
            if (post.frontmatter.category) {
                categories.add(post.frontmatter.category)
            }
        })

        for (const category of categories) {
            urls.push({
                loc: `${baseUrl}/category/${contentManager.slugify(category)}`,
                lastmod: new Date().toISOString(),
                priority: "0.6",
                changefreq: "weekly",
            })
        }
    }

    // Add tag pages only if they exist and have content
    if (analysis.hasPosts && analysis.hasTags) {
        const tags = new Set()
        posts.forEach((post) => {
            if (post.frontmatter.tags) {
                const tagArray = Array.isArray(post.frontmatter.tags)
                    ? post.frontmatter.tags
                    : typeof post.frontmatter.tags === "string"
                    ? post.frontmatter.tags.split(",").map((t) => t.trim())
                    : []
                tagArray.forEach((tag) => {
                    if (tag) tags.add(tag)
                })
            }
        })

        for (const tag of tags) {
            urls.push({
                loc: `${baseUrl}/tag/${contentManager.slugify(tag)}`,
                lastmod: new Date().toISOString(),
                priority: "0.5",
                changefreq: "weekly",
            })
        }
    }

    // Add RSS feed only if posts exist
    if (analysis.hasPosts) {
        urls.push({
            loc: `${baseUrl}/rss.xml`,
            lastmod: new Date().toISOString(),
            priority: "0.4",
            changefreq: "daily",
        })
    }

    // Generate XML
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
    .map(
        (url) => `  <url>
    <loc>${url.loc ? url.loc : "/"}</loc>
    <lastmod>${new Date(url.lastmod).toISOString()}</lastmod>
    <priority>${url.priority}</priority>
    <changefreq>${url.changefreq}</changefreq>
  </url>`
    )
    .join("\n")}
</urlset>`
}

/**
 * Generates an HTML sitemap for the site with intelligent section detection
 * @param {Object} options - Options for HTML sitemap generation
 * @param {Array} options.posts - Array of posts
 * @param {Array} options.pages - Array of pages
 * @param {Object} options.siteSettings - Site settings object
 * @param {string} options.baseUrl - Base URL for the site
 * @param {Object} options.contentManager - Content manager instance (for slugify)
 * @param {Object} options.themeManager - Theme manager instance
 * @returns {string} The HTML sitemap content
 */
export async function generateSitemapHtml({ posts, pages, siteSettings, baseUrl, contentManager, themeManager }) {
    // Ensure baseUrl has no trailing slash
    baseUrl = baseUrl.replace(/\/$/, "")

    // Analyze site structure
    const analysis = await analyzeSiteStructure({ posts, pages, themeManager })

    const sitemapStructure = {
        home: { title: "Home", url: baseUrl, items: [] },
    }

    // Only add sections that actually exist and have content

    // Blog Posts section (only if posts exist)
    if (analysis.hasPosts) {
        const blogSection = {
            title: "Blog Posts",
            url: analysis.blogIndexPage ? `${baseUrl}/${analysis.blogIndexPage.slug}` : null,
            items: [],
        }

        for (const post of posts) {
            if (post.frontmatter && post.frontmatter.slug) {
                blogSection.items.push({
                    title: post.frontmatter.title,
                    url: `${baseUrl}/post/${post.frontmatter.slug}`,
                    date: new Date(post.frontmatter.updatedAt || post.frontmatter.createdAt).toLocaleDateString(),
                })
            }
        }

        sitemapStructure.posts = blogSection
    }

    // Pages section (only if pages exist)
    if (analysis.hasPages) {
        const pagesSection = { title: "Pages", url: null, items: [] }

        // Add custom pages with proper path resolution
        for (const [slug, pageInfo] of analysis.nestedCustomPages.entries()) {
            const { page, fullPath, hasTemplate } = pageInfo

            // Apply same filtering logic as XML sitemap
            if (!hasTemplate && pageInfo.isNested) {
                let hasParentWithTemplate = false
                let currentSlug = pageInfo.parentSlug

                while (currentSlug) {
                    const parentInfo = analysis.nestedCustomPages.get(currentSlug)
                    if (parentInfo?.hasTemplate) {
                        hasParentWithTemplate = true
                        break
                    }
                    currentSlug = parentInfo?.parentSlug
                }

                if (!hasParentWithTemplate) {
                    console.warn(`Custom page ${slug} and its parents have no templates, skipping from HTML sitemap...`)
                    continue
                }
            } else if (!hasTemplate && !pageInfo.isNested) {
                console.warn(`Custom page ${slug} has no template, skipping from HTML sitemap...`)
                continue
            }

            // Determine the URL based on page type
            const pageUrl =
                page.frontmatter.pageType === "custom"
                    ? `${baseUrl}/${fullPath}`
                    : `${baseUrl}/page/${page.frontmatter.slug}`

            pagesSection.items.push({
                title: page.frontmatter.title,
                url: pageUrl,
                date: new Date(page.frontmatter.updatedAt || page.frontmatter.createdAt).toLocaleDateString(),
            })
        }

        // Add regular pages
        const regularPages = pages.filter(
            (page) => page.frontmatter.pageType !== "custom" && page.frontmatter.status === "published"
        )

        for (const page of regularPages) {
            if (page.frontmatter && page.frontmatter.slug) {
                pagesSection.items.push({
                    title: page.frontmatter.title,
                    url: `${baseUrl}/page/${page.frontmatter.slug}`,
                    date: new Date(page.frontmatter.updatedAt || page.frontmatter.createdAt).toLocaleDateString(),
                })
            }
        }

        if (pagesSection.items.length > 0) {
            sitemapStructure.pages = pagesSection
        }
    }

    // Categories section (only if posts exist and have categories)
    if (analysis.hasPosts && analysis.hasCategories) {
        const categoriesSection = {
            title: "Categories",
            url: null, // Will be set conditionally below
            items: [],
        }

        // Only add Categories Index if template exists
        if (analysis.hasCategoriesTemplate) {
            categoriesSection.url = analysis.categoriesIndexPage
                ? `${baseUrl}/${analysis.categoriesIndexPage.slug}`
                : `${baseUrl}/categories`
        }

        const categories = new Set()
        posts.forEach((post) => {
            if (post.frontmatter.category) {
                categories.add(post.frontmatter.category)
            }
        })

        // Sort categories alphabetically and add to items
        Array.from(categories)
            .sort((a, b) => a.localeCompare(b))
            .forEach((category) => {
                categoriesSection.items.push({
                    title: category,
                    url: `${baseUrl}/category/${contentManager.slugify(category)}`,
                    date: "Updated regularly",
                })
            })

        sitemapStructure.categories = categoriesSection
    }

    // Tags section (only if posts exist and have tags)
    if (analysis.hasPosts && analysis.hasTags) {
        const tagsSection = {
            title: "Tags",
            url: null, // Will be set conditionally below
            items: [],
        }

        // Only add Tags Index if template exists
        if (analysis.hasTagsTemplate) {
            tagsSection.url = analysis.tagsIndexPage ? `${baseUrl}/${analysis.tagsIndexPage.slug}` : `${baseUrl}/tags`
        }

        const tags = new Set()
        posts.forEach((post) => {
            if (post.frontmatter.tags) {
                const tagArray = Array.isArray(post.frontmatter.tags)
                    ? post.frontmatter.tags
                    : typeof post.frontmatter.tags === "string"
                    ? post.frontmatter.tags.split(",").map((t) => t.trim())
                    : []
                tagArray.forEach((tag) => {
                    if (tag) tags.add(tag)
                })
            }
        })

        // Sort tags alphabetically and add to items
        Array.from(tags)
            .sort((a, b) => a.localeCompare(b))
            .forEach((tag) => {
                tagsSection.items.push({
                    title: tag,
                    url: `${baseUrl}/tag/${contentManager.slugify(tag)}`,
                    date: "Updated regularly",
                })
            })

        sitemapStructure.tags = tagsSection
    }

    // Other section (only include items that exist)
    const otherSection = { title: "Other", url: null, items: [] }

    // Only add RSS if posts exist
    if (analysis.hasPosts) {
        otherSection.items.push({
            title: "RSS Feed",
            url: `${baseUrl}/rss.xml`,
            date: "Updated daily",
        })
    }

    otherSection.items.push({
        title: "XML Sitemap",
        url: `${baseUrl}/sitemap.xml`,
        date: "Updated daily",
    })

    if (otherSection.items.length > 0) {
        sitemapStructure.other = otherSection
    }

    // Generate HTML content
    let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sitemap - ${siteSettings.siteTitle || "Website"}</title>
    <style>
        :root {
            --primary-color: #1976d2;
            --secondary-color: #f5f5f5;
            --text-color: #333;
            --light-text: #757575;
            --border-color: #e0e0e0;
            --card-bg: white;
            --card-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--secondary-color);
            max-width: 100%;
            overflow-x: hidden;
            padding-bottom: 50px;
        }
        
        a {
            color: var(--primary-color);
            text-decoration: none;
            transition: color 0.2s;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        header {
            background-color: var(--primary-color);
            color: white;
            padding: 40px 0;
            margin-bottom: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        header h1 {
            margin-bottom: 10px;
        }
        
        header p {
            opacity: 0.9;
        }
        
        .sitemap-section {
            background-color: var(--card-bg);
            border-radius: 8px;
            box-shadow: var(--card-shadow);
            margin-bottom: 30px;
            overflow: hidden;
        }
        
        .section-header {
            background-color: var(--primary-color);
            color: white;
            padding: 15px 20px;
        }
        
        .section-content {
            padding: 0;
        }
        
        .item-list {
            list-style: none;
        }
        
        .list-item {
            border-bottom: 1px solid var(--border-color);
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background-color 0.2s;
        }
        
        .list-item:last-child {
            border-bottom: none;
        }
        
        .list-item:hover {
            background-color: var(--secondary-color);
        }
        
        .item-link {
            flex-grow: 1;
            margin-right: 15px;
        }
        
        .item-date {
            color: var(--light-text);
            font-size: 0.9rem;
            white-space: nowrap;
        }
        
        footer {
            margin-top: 40px;
            text-align: center;
            color: var(--light-text);
        }
        
        .home-link {
            display: inline-block;
            margin-top: 20px;
            background-color: var(--primary-color);
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            font-weight: 500;
            box-shadow: var(--card-shadow);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .home-link:hover {
            text-decoration: none;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        @media (max-width: 768px) {
            .list-item {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .item-date {
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>Sitemap</h1>
            <p>A complete guide to all pages on ${siteSettings.siteTitle || "our website"}</p>
        </div>
    </header>
    
    <div class="container">`

    // Generate HTML for each section that exists
    for (const [key, section] of Object.entries(sitemapStructure)) {
        // Skip sections with no items and no section URL
        if (section.items.length === 0 && !section.url) continue

        htmlContent += `
        <div class="sitemap-section">
            <div class="section-header">
                <h2>${section.title}</h2>
            </div>
            <div class="section-content">
                <ul class="item-list">`

        // Add section URL as the first item if it exists
        if (section.url) {
            htmlContent += `
                    <li class="list-item">
                        <div class="item-link">
                            <a href="${section.url}">${section.title} Index</a>
                        </div>
                        <div class="item-date">Updated regularly</div>
                    </li>`
        }

        // Add all section items
        for (const item of section.items) {
            htmlContent += `
                    <li class="list-item">
                        <div class="item-link">
                            <a href="${item.url}">${item.title}</a>
                        </div>
                        <div class="item-date">${item.date}</div>
                    </li>`
        }

        htmlContent += `
                </ul>
            </div>
        </div>`
    }

    htmlContent += `
        <footer>
            <p>Last updated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            <a href="${baseUrl ? baseUrl : "/"}" class="home-link">Return to Homepage</a>
        </footer>
    </div>
</body>
</html>`

    return htmlContent
}

/**
 * Function to generate robots.txt
 * @param {string} options.baseUrl - Base URL for the site
 * @returns {string} The robots.txt content
 */
export function generateRobotsTxt({ baseUrl }) {
    // Ensure baseUrl has no trailing slash
    baseUrl = baseUrl.replace(/\/$/, "")

    return `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/rss.xml
`
}

/**
 * Determines the MIME type based on a file's extension extracted from its URL
 *
 * @param {string} url - The URL or file path containing the file extension
 * @returns {string} - The corresponding MIME type for the file extension,
 *                     or 'application/octet-stream' if the extension is not recognized
 *
 * @example
 * // Returns 'image/jpeg'
 * getMimeTypeFromUrl('/path/to/image.jpg');
 *
 * @example
 * // Returns 'image/webp'
 * getMimeTypeFromUrl('https://example.com/images/photo.webp');
 */
function getMimeTypeFromUrl(url) {
    // Extract the file extension from the URL by splitting on '.' and taking the last part
    const extension = url.split(".").pop().toLowerCase()

    // Map of file extensions to their corresponding MIME types
    // This covers common web image formats
    const mimeTypes = {
        avif: "image/avif",
        gif: "image/gif",
        ico: "image/x-icon",
        jpeg: "image/jpeg",
        jpg: "image/jpeg",
        png: "image/png",
        svg: "image/svg+xml",
        webp: "image/webp",
    }

    // Return the MIME type if the extension is recognized, otherwise return a generic binary type
    return mimeTypes[extension] || "application/octet-stream"
}
