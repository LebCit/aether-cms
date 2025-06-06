/**
 * Generates pagination URLs based on context and pagination data
 * @param {Object} params - Parameters for URL generation
 * @param {boolean} params.isGenerateStatic - Whether generating for static site
 * @param {string} params.contentType - The type of content ('category', 'tag', 'custom', etc.)
 * @param {string} params.slug - The slug for the current content
 * @param {Object} params.pagination - The pagination data object
 * @param {boolean} params.cleanUrls - Whether to use clean URLs (no .html extension)
 * @returns {Object} Object containing all pagination URLs
 */
export function generatePaginationUrls({ isGenerateStatic, contentType, slug, pagination, cleanUrls = true }) {
    // For dynamic sites, we just use query parameters
    if (!isGenerateStatic) {
        return {
            first: `?page=1`,
            prev: pagination.prevPage ? `?page=${pagination.prevPage}` : null,
            current: `?page=${pagination.currentPage}`,
            next: pagination.nextPage ? `?page=${pagination.nextPage}` : null,
            last: `?page=${pagination.totalPages}`,
        }
    }

    // For static sites with clean URLs
    if (cleanUrls) {
        // Handle custom pages differently (they don't have contentType in the path)
        const basePath = contentType === "custom" ? `/${slug}` : `/${contentType}/${slug}`

        return {
            first: basePath,
            prev:
                pagination.prevPage === 1
                    ? basePath
                    : pagination.prevPage
                    ? `${basePath}/page/${pagination.prevPage}`
                    : null,
            current: pagination.currentPage === 1 ? basePath : `${basePath}/page/${pagination.currentPage}`,
            next: pagination.nextPage ? `${basePath}/page/${pagination.nextPage}` : null,
            last: pagination.totalPages > 1 ? `${basePath}/page/${pagination.totalPages}` : basePath,
        }
    }

    // For static sites without clean URLs
    const extension = ".html"
    const basePath = contentType === "custom" ? `/${slug}${extension}` : `/${contentType}/${slug}${extension}`
    const pageDir = contentType === "custom" ? `/${slug}` : `/${contentType}/${slug}`

    return {
        first: basePath,
        prev:
            pagination.prevPage === 1
                ? basePath
                : pagination.prevPage
                ? `${pageDir}/page-${pagination.prevPage}${extension}`
                : null,
        current: pagination.currentPage === 1 ? basePath : `${pageDir}/page-${pagination.currentPage}${extension}`,
        next: pagination.nextPage ? `${pageDir}/page-${pagination.nextPage}${extension}` : null,
        last: pagination.totalPages > 1 ? `${pageDir}/page-${pagination.totalPages}${extension}` : basePath,
    }
}

/**
 * Enhanced format pagination that adds URL information
 * @param {Object} pagination - The LiteNode pagination object
 * @param {Object} options - Options for URL generation
 * @returns {Object} Enhanced pagination object with URLs
 */
export function enhancedFormatPagination(pagination, options) {
    // First convert to our standard format
    const formattedPagination = {
        currentPage: pagination.page,
        totalItems: pagination.total_files,
        pageSize: pagination.per_page,
        totalPages: pagination.total_pages,
        prevPage: pagination.prev_page,
        nextPage: pagination.next_page,
    }

    // Then add URLs if options are provided
    if (options) {
        formattedPagination.urls = generatePaginationUrls({
            ...options,
            pagination: formattedPagination,
        })
    }

    return formattedPagination
}

/**
 * Retrieves sibling custom pages and builds navigation for the current page (for CMS).
 *
 * @param {Object} contentPage - The current content page for which sibling navigation is being built.
 * @param {Object} contentManager - The content manager instance for fetching all custom pages.
 * @param {Object} req - The request object to build the sibling URLs.
 * @returns {Object|null} - Returns an object containing sibling navigation (siblings, prev, next, parentTitle), or null if no sibling navigation is found.
 */
export async function getSiblingCustomPagesNavigation(contentPage, contentManager, req) {
    let siblingNavigation = null

    // Ensure there's a content page
    if (contentPage) {
        try {
            // Step 1: Get all custom pages
            const allCustomPages = await contentManager.getPages({
                status: "published",
                pageType: "custom",
                frontmatterOnly: true,
            })

            // Step 2: Build lookup maps for slugs and used parent slugs
            const slugToPageMap = new Map()
            const usedParentSlugs = new Set()

            for (const page of allCustomPages) {
                const { slug, parentPage } = page.frontmatter
                if (slug) slugToPageMap.set(slug, page)
                if (parentPage) usedParentSlugs.add(parentPage)
            }

            // Step 3: Get the parentSlug of the current page, and validate it
            const potentialParentSlug = contentPage.frontmatter.parentPage || null
            const parentSlug =
                potentialParentSlug && slugToPageMap.has(potentialParentSlug) ? potentialParentSlug : null

            if (parentSlug) {
                // Step 4: Filter pages that are siblings (same parent) but not the current page
                let siblingPages = allCustomPages.filter((page) => page.frontmatter.parentPage === parentSlug)

                if (siblingPages.length > 1) {
                    // Step 5: Sort siblings by publishDate, then title
                    siblingPages.sort((a, b) => {
                        const dateA = a.frontmatter.publishDate ? new Date(a.frontmatter.publishDate) : new Date(0)
                        const dateB = b.frontmatter.publishDate ? new Date(b.frontmatter.publishDate) : new Date(0)
                        if (dateA - dateB !== 0) return dateA - dateB
                        return a.frontmatter.title.localeCompare(b.frontmatter.title)
                    })

                    // Assign dynamic order based on position
                    siblingPages.forEach((page, index) => {
                        page.generatedOrder = index
                    })

                    // Step 6: Find current page index
                    const currentIndex = siblingPages.findIndex(
                        (page) => page.frontmatter.slug === contentPage.frontmatter.slug
                    )

                    // Step 7: Build URL for a sibling page
                    const buildSiblingUrl = (page) => {
                        const currentPath = req.url.split("/").filter(Boolean)
                        const siblingPath = [...currentPath.slice(0, -1), page.frontmatter.slug]
                        return `/${siblingPath.join("/")}`
                    }

                    // Step 8: Build the sibling navigation object
                    siblingNavigation = {
                        siblings: siblingPages.map((page) => ({
                            title: page.frontmatter.title,
                            slug: page.frontmatter.slug,
                            url: buildSiblingUrl(page),
                            active: page.frontmatter.slug === contentPage.frontmatter.slug,
                            order: page.generatedOrder,
                        })),
                        prev:
                            currentIndex > 0
                                ? {
                                      title: siblingPages[currentIndex - 1].frontmatter.title,
                                      slug: siblingPages[currentIndex - 1].frontmatter.slug,
                                      url: buildSiblingUrl(siblingPages[currentIndex - 1]),
                                      order: siblingPages[currentIndex - 1].generatedOrder,
                                  }
                                : null,
                        next:
                            currentIndex < siblingPages.length - 1
                                ? {
                                      title: siblingPages[currentIndex + 1].frontmatter.title,
                                      slug: siblingPages[currentIndex + 1].frontmatter.slug,
                                      url: buildSiblingUrl(siblingPages[currentIndex + 1]),
                                      order: siblingPages[currentIndex + 1].generatedOrder,
                                  }
                                : null,
                        parentTitle: slugToPageMap.get(parentSlug)?.frontmatter?.title ?? null,
                    }
                }
            }
        } catch (error) {
            console.error("Error building sibling navigation:", error)
        }
    }

    return siblingNavigation
}

/**
 * Builds sibling navigation for all custom pages in batch (for SSG).
 * This processes all pages at once to avoid repeated calculations during static generation.
 * Matches CMS behavior - only creates navigation for pages with parents.
 *
 * @param {Array} customPages - Array of all custom pages to process
 * @returns {Map<string, Object>} - Map of page slug to sibling navigation object
 */
export function buildSiblingCustomPagesNavigation(customPages) {
    // Result map: slug -> sibling navigation object
    const navigationMap = new Map()

    // Step 1: Build lookup maps for efficient access
    const slugToPageMap = new Map()
    const pagesByParent = new Map()

    for (const page of customPages) {
        const { slug, parentPage } = page.frontmatter
        if (slug) {
            slugToPageMap.set(slug, page)

            // Group pages by parent
            const parent = parentPage || null
            if (!pagesByParent.has(parent)) {
                pagesByParent.set(parent, [])
            }
            pagesByParent.get(parent).push(page)
        }
    }

    // Step 2: Process each group of siblings
    for (const [parentSlug, siblingPages] of pagesByParent.entries()) {
        // Skip root-level pages (those without parents) to match CMS behavior
        if (parentSlug === null) continue

        // Skip if only one page (no siblings)
        if (siblingPages.length <= 1) continue

        // Sort siblings by order, then title
        siblingPages.sort((a, b) => {
            const dateA = a.frontmatter.publishDate ? new Date(a.frontmatter.publishDate) : new Date(0)
            const dateB = b.frontmatter.publishDate ? new Date(b.frontmatter.publishDate) : new Date(0)
            if (dateA - dateB !== 0) return dateA - dateB
            return a.frontmatter.title.localeCompare(b.frontmatter.title)
        })

        // Assign generated order
        siblingPages.forEach((page, index) => {
            page.generatedOrder = index
        })

        // Step 3: Build navigation for each page in this sibling group
        for (let i = 0; i < siblingPages.length; i++) {
            const currentPage = siblingPages[i]
            const currentSlug = currentPage.frontmatter.slug

            // Build sibling navigation object
            const siblingNavigation = {
                siblings: siblingPages.map((page) => ({
                    title: page.frontmatter.title,
                    slug: page.frontmatter.slug,
                    url: buildPageUrl(page, customPages),
                    active: page.frontmatter.slug === currentSlug,
                    order: page.generatedOrder,
                })),
                prev:
                    i > 0
                        ? {
                              title: siblingPages[i - 1].frontmatter.title,
                              slug: siblingPages[i - 1].frontmatter.slug,
                              url: buildPageUrl(siblingPages[i - 1], customPages),
                              order: siblingPages[i - 1].generatedOrder,
                          }
                        : null,
                next:
                    i < siblingPages.length - 1
                        ? {
                              title: siblingPages[i + 1].frontmatter.title,
                              slug: siblingPages[i + 1].frontmatter.slug,
                              url: buildPageUrl(siblingPages[i + 1], customPages),
                              order: siblingPages[i + 1].generatedOrder,
                          }
                        : null,
                parentTitle: parentSlug ? slugToPageMap.get(parentSlug)?.frontmatter?.title ?? null : null,
            }

            // Store in the map
            navigationMap.set(currentSlug, siblingNavigation)
        }
    }

    return navigationMap
}

/**
 * Helper function to build the full URL path for a page in SSG context
 */
function buildPageUrl(page, allPages) {
    const parentChain = []
    let currentPage = page

    // Build the parent chain by traversing up
    while (currentPage.frontmatter.parentPage) {
        const parent = allPages.find((p) => p.frontmatter.slug === currentPage.frontmatter.parentPage)
        if (!parent) break

        parentChain.unshift(parent.frontmatter.slug)
        currentPage = parent
    }

    // Create the nested URL path
    const pathParts = [...parentChain, page.frontmatter.slug]
    return `/${pathParts.join("/")}`
}
