import { existsSync } from "node:fs"
import { normalize, sep } from "node:path"

/**
 * Resolves the appropriate template path based on content type and hierarchy rules
 *
 * Template resolution follows these rules:
 * 1. For homepage: First try custom/homepage.html
 * 2. For custom pages: Try custom/<slug>.html
 * 3. For taxonomies: Try custom/<slug>.html or custom/<taxonomy-type>.html then templates/taxonomy.html
 * 4. Try content-specific template: <type>.html (e.g., post.html, page.html, category.html)
 * 5. Try generic content template: content.html
 * 6. Fall back to layout.html
 *
 * @param {Object} options - Template resolution options
 * @param {Object} options.themeManager - The theme manager instance
 * @param {string} options.contentType - Primary content type ('home', 'post', 'page', 'category', 'tag', 'custom')
 * @param {string} [options.slug] - Content slug (required for custom pages)
 * @param {boolean} [options.isCustomPage=false] - Whether this is a custom page
 * @param {boolean} [options.isTaxonomy=false] - Whether this is a taxonomy page
 * @returns {Promise<string>} The resolved template path
 */
export async function resolveTemplatePath({
    themeManager,
    contentType,
    slug,
    isCustomPage = false,
    isTaxonomy = false,
}) {
    // Default fallback template
    let templatePath = themeManager.getTemplatePath("layout.html")

    // 1. Homepage
    if (contentType === "home") {
        // Check for custom/homepage.html template first
        const customHomeTemplatePath = themeManager.getCustomTemplatePath("custom", "homepage.html")
        if (existsSync(customHomeTemplatePath)) {
            return customHomeTemplatePath
        }
    }

    // 2. For custom pages, check for slug-specific template
    if (isCustomPage && slug) {
        // First, try the exact slug template (handles both nested and single level)
        const customTemplatePath = themeManager.getCustomTemplatePath("custom", `${slug}.html`)
        if (existsSync(customTemplatePath)) {
            return customTemplatePath
        }

        // If slug contains hyphens (likely nested), try parent template
        if (slug.includes("-")) {
            // Get the immediate parent by removing the last segment
            const parts = slug.split("-")
            const parentSlug = parts.slice(0, -1).join("-")

            const parentTemplatePath = themeManager.getCustomTemplatePath("custom", `${parentSlug}.html`)
            if (existsSync(parentTemplatePath)) {
                return parentTemplatePath
            }

            // If parent template doesn't exist, and there are more than 2 parts,
            // try the grandparent template (e.g., for documentation-intro-install, try documentation.html)
            if (parts.length > 2) {
                const grandparentSlug = parts[0]

                const grandparentTemplatePath = themeManager.getCustomTemplatePath("custom", `${grandparentSlug}.html`)
                if (existsSync(grandparentTemplatePath)) {
                    return grandparentTemplatePath
                }
            }
        }
    }

    /**
     * III. For taxonomies (categories, tags)
     * 1. For custom taxonomy pages: First try custom/<slug>.html (e.g., custom/tech.html)
     * 2. For custom taxonomy pages: Then try general custom taxonomy template (e.g., custom/category.html)
     * 3. Fall back to taxonomy.html
     */
    if (isTaxonomy) {
        const taxonomyTemplatePath = themeManager.getTemplatePath("taxonomy.html")
        // Check for custom taxonomy template with specific slug (e.g., custom/category-tech.html)
        if (slug) {
            const slugSpecificTemplatePath = themeManager.getCustomTemplatePath("custom", `${contentType}-${slug}.html`)

            if (existsSync(slugSpecificTemplatePath)) {
                return slugSpecificTemplatePath
            } else {
                // Check for general custom taxonomy template
                const customTaxonomyPath = themeManager.getCustomTemplatePath("custom", `${contentType}.html`)

                if (existsSync(customTaxonomyPath)) {
                    return customTaxonomyPath
                }
            }
        }

        // Check for taxonomy.html
        if (existsSync(taxonomyTemplatePath)) {
            return taxonomyTemplatePath
        }
    }

    // 4. Try content-specific template
    const specificTemplatePath = themeManager.getTemplatePath(`${contentType}.html`)
    if (existsSync(specificTemplatePath)) {
        return specificTemplatePath
    }

    // 5. Try generic content template
    const contentTemplatePath = themeManager.getTemplatePath("content.html")
    if (existsSync(contentTemplatePath)) {
        return contentTemplatePath
    }

    // 6. Fall back to layout.html
    return templatePath
}

/**
 * Validates a template path exists, with a fallback option
 * @param {string} path - The template path to check
 * @param {string} fallback - Fallback path if the primary doesn't exist
 * @returns {string} Valid template path
 */
export function validateTemplatePath(path, fallback) {
    return existsSync(path) ? path : fallback
}

/**
 * Checks if a template path follows the themes/themeName/custom pattern
 * and identifies the template file slug (category, tag, etc.)
 *
 * @param {string} templatePath - The path to check, e.g. 'content/themes/pure/custom/category.html'
 * @returns {Object} - Object containing:
 *   - isCustomTemplate: boolean - True if follows themes/themeName/custom pattern
 *   - templateSlug: string|null - The template type (e.g., 'category', 'tag', 'whatever') or null if not found
 *
 * @example
 * checkCustomTemplate('content/themes/pure/custom/category.html');
 * // Returns { isCustomTemplate: true, templateSlug: 'category' }
 *
 * checkCustomTemplate('content/themes/pure/category.html');
 * // Returns { isCustomTemplate: false, templateSlug: null }
 */
export function checkCustomTemplate(templatePath) {
    // Initialize the result object
    const result = {
        isCustomTemplate: false,
        templateSlug: null,
    }

    // Normalize the path to handle different OS path formats (/ vs \)
    const normalizedPath = normalize(templatePath)

    // Split the path into individual directory/file segments
    const pathParts = normalizedPath.split(sep)

    // Find the index of 'themes' in the path segments
    const themesIndex = pathParts.indexOf("themes")

    // Check if:
    // 1. 'themes' exists in the path
    // 2. There are at least 2 more segments after 'themes'
    // 3. The second segment after 'themes' is exactly 'custom'
    // 4. There is at least one more segment (the filename) after 'custom'
    if (themesIndex !== -1 && themesIndex + 3 < pathParts.length && pathParts[themesIndex + 2] === "custom") {
        // Set isCustomTemplate to true as we found the pattern
        result.isCustomTemplate = true

        // Get the filename (which should be at themesIndex + 3)
        const filename = pathParts[themesIndex + 3]

        // Check if the filename ends with .html
        if (filename.endsWith(".html")) {
            // Extract the template type by removing the .html extension
            result.templateSlug = filename.replace(".html", "")
        }
    }

    return result
}

/**
 * Applies custom template metadata to the template data object based on template analysis
 *
 * This function consolidates the repetitive pattern found in taxonomy routes and static site generation:
 * 1. Checks if the resolved template is a custom template
 * 2. Retrieves the content for that template if it exists
 * 3. Properly merges the content's metadata with the template data
 * 4. Handles special formatting for taxonomy pages (categories/tags)
 *
 * @param {Object} options - Options for applying template metadata
 * @param {string} options.templatePath - The resolved template path
 * @param {Object} options.contentManager - Content manager instance for retrieving content
 * @param {Object} options.templateData - The template data to enhance
 * @param {string} [options.taxonomyType] - The taxonomy type ('category' or 'tag') if applicable
 * @param {string} [options.taxonomyTerm] - The taxonomy term (category name or tag) if applicable
 * @param {number} [options.itemCount] - The number of items (posts) for the taxonomy
 * @param {number} [options.page=1] - The current page number for pagination
 * @returns {Promise<Object>} - The enhanced template data
 */
export async function applyTemplateMetadata({
    templatePath,
    contentManager,
    templateData,
    taxonomyType,
    taxonomyTerm,
    itemCount,
    page = 1,
}) {
    // Create a copy of the templateData to avoid modifying the original
    const enhancedData = { ...templateData }

    // Check if this is a custom template
    const { isCustomTemplate, templateSlug } = checkCustomTemplate(templatePath)

    if (isCustomTemplate) {
        // Try to find the custom page to get its metadata
        const contentPage = await contentManager.getContentByProperty("page", "slug", templateSlug)

        if (contentPage && contentPage.frontmatter) {
            // Add metadata from the custom page
            enhancedData.metadata = contentPage.frontmatter

            // Handle special taxonomy formatting if this is a taxonomy page
            if (taxonomyType && taxonomyTerm) {
                // Only if it's the general custom taxonomy template (custom/category.html or custom/tag.html)
                if (templateSlug === taxonomyType) {
                    // Apply type-specific formatting
                    if (taxonomyType === "category") {
                        enhancedData.metadata.title =
                            page === 1 ? `Category: ${taxonomyTerm}` : `Category: ${taxonomyTerm} - Page ${page}`

                        if (itemCount !== undefined) {
                            enhancedData.metadata.subtitle = `${itemCount} posts in ${taxonomyTerm}`
                        }

                        enhancedData.metadata.description = `Discover the latest articles in the ${taxonomyTerm} category`
                    } else if (taxonomyType === "tag") {
                        enhancedData.metadata.title =
                            page === 1 ? `Tagged: ${taxonomyTerm}` : `Tagged: ${taxonomyTerm} - Page ${page}`

                        if (itemCount !== undefined) {
                            enhancedData.metadata.subtitle = `${itemCount} posts tagged ${taxonomyTerm}`
                        }

                        enhancedData.metadata.description = `Read posts tagged ${taxonomyTerm}`
                    }
                }
            }

            // Add the content from the custom page if it exists
            if (contentPage.content) {
                // Check if marked is available (for static site generator)
                if (typeof marked !== "undefined") {
                    enhancedData.content = marked.parse(contentPage.content)
                } else {
                    enhancedData.content = contentPage.content
                }
            }
        }
    } else if (taxonomyType && taxonomyTerm) {
        // For non-custom templates, still provide basic metadata for taxonomy pages
        enhancedData.metadata = {
            title:
                page === 1
                    ? taxonomyType === "category"
                        ? `Category: ${taxonomyTerm}`
                        : `Tagged: ${taxonomyTerm}`
                    : (taxonomyType === "category" ? `Category: ${taxonomyTerm}` : `Tagged: ${taxonomyTerm}`) +
                      ` - Page ${page}`,
        }

        if (itemCount !== undefined) {
            enhancedData.metadata.subtitle =
                taxonomyType === "category"
                    ? `${itemCount} posts in ${taxonomyTerm}`
                    : `${itemCount} posts tagged ${taxonomyTerm}`

            enhancedData.metadata.description =
                taxonomyType === "category"
                    ? `Discover the latest articles in the ${taxonomyTerm} category`
                    : `Read posts tagged ${taxonomyTerm}`
        }
    }

    return enhancedData
}
