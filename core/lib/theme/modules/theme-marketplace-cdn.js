import AdmZip from "adm-zip"
import { join } from "node:path"
import { writeFile, mkdir } from "node:fs/promises"

/**
 * CDN-based marketplace that bypasses GitHub API rate limits
 */
export class ThemeMarketplaceCDN {
    constructor(config = {}) {
        // CDN URL where GitHub Pages serves the marketplace data
        this.cdnBaseUrl = config.cdnUrl || "https://lebcit.github.io/aether-themes"
        this.cache = new Map()
        this.cacheDuration = config.cacheDuration || 300000 // 5 minutes
        this.persistentCachePath = config.cachePath || "./content/cache/marketplace"

        // Initialize persistent cache
        this.initializeCache()
    }

    /**
     * Initialize persistent cache directory
     */
    async initializeCache() {
        try {
            await mkdir(this.persistentCachePath, { recursive: true })
            await this.loadPersistentCache()
        } catch (error) {
            console.error("Cache initialization error:", error)
        }
    }

    /**
     * Load cached data from disk
     */
    async loadPersistentCache() {
        try {
            const { readFile } = await import("node:fs/promises")
            const cachePath = join(this.persistentCachePath, "themes-cache.json")
            const cacheContent = await readFile(cachePath, "utf8")
            const cacheData = JSON.parse(cacheContent)

            // Restore cache if not expired
            if (cacheData.timestamp > Date.now() - this.cacheDuration) {
                this.cache.set("marketplace-themes", {
                    data: cacheData.themes,
                    timestamp: cacheData.timestamp,
                })
            }
        } catch (error) {
            // No cache file exists yet, that's okay
        }
    }

    /**
     * Save cache to disk
     */
    async savePersistentCache(themes) {
        try {
            const cachePath = join(this.persistentCachePath, "themes-cache.json")
            const cacheData = {
                themes: themes,
                timestamp: Date.now(),
            }

            await writeFile(cachePath, JSON.stringify(cacheData), "utf8")
        } catch (error) {
            console.error("Error saving cache:", error)
        }
    }

    /**
     * Fetch themes from CDN (no rate limits!)
     */
    async getAvailableThemes() {
        const cacheKey = "marketplace-themes"
        const cached = this.cache.get(cacheKey)

        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            return cached.data
        }

        try {
            const response = await fetch(`${this.cdnBaseUrl}/themes.json`)

            if (!response.ok) {
                throw new Error(`Failed to fetch themes: ${response.status} ${response.statusText}`)
            }

            const themes = await response.json()

            // Cache the results in memory
            this.cache.set(cacheKey, {
                data: themes,
                timestamp: Date.now(),
            })

            // Save to persistent cache
            await this.savePersistentCache(themes)

            return themes
        } catch (error) {
            console.error("CDN marketplace fetch error:", error)

            // Return cached data if available
            if (cached) {
                return cached.data
            }

            throw error
        }
    }

    /**
     * Get single theme details
     */
    async getThemeDetails(themeName) {
        const allThemes = await this.getAvailableThemes()
        const theme = allThemes.find((theme) => theme.marketplaceName === themeName)

        if (!theme) {
            console.warn(`Theme not found: ${themeName}`)
            return null
        }

        return theme
    }

    /**
     * Get categories from CDN
     */
    async getCategories() {
        try {
            const response = await fetch(`${this.cdnBaseUrl}/categories.json`)

            if (!response.ok) {
                throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error fetching categories from CDN:", error)

            // Fallback: extract from themes
            try {
                const themes = await this.getAvailableThemes()
                const categories = new Set()
                themes.forEach((theme) => {
                    if (theme.tags && Array.isArray(theme.tags)) {
                        theme.tags.forEach((tag) => categories.add(tag))
                    }
                })
                return Array.from(categories).sort()
            } catch (fallbackError) {
                console.error("Fallback category extraction failed:", fallbackError)
                return []
            }
        }
    }

    /**
     * Download theme zip directly from GitHub (bypasses API)
     */
    async downloadTheme(themeName) {
        const allThemes = await this.getAvailableThemes()
        const theme = allThemes.find((t) => t.marketplaceName === themeName)

        if (!theme) {
            throw new Error(`Theme not found: ${themeName}`)
        }

        // Extract repository owner and name from sourceRepo
        const [owner, repo] = theme.sourceRepo.split("/")

        // Use GitHub's direct archive download (no API needed)
        const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`

        try {
            const response = await fetch(zipUrl)

            if (!response.ok) {
                throw new Error(`Failed to download repository: ${response.status} ${response.statusText}`)
            }

            // Get the ZIP as buffer
            const buffer = await response.arrayBuffer()

            // Extract just the specific theme directory from the ZIP
            return await this.extractThemeFromRepoZip(Buffer.from(buffer), themeName)
        } catch (error) {
            console.error("Theme download error:", error)
            throw error
        }
    }

    /**
     * Extract a specific theme directory from the repository ZIP
     */
    async extractThemeFromRepoZip(repoZipBuffer, themeName) {
        try {
            // Open the repository ZIP
            const repoZip = new AdmZip(repoZipBuffer)
            const entries = repoZip.getEntries()

            // Create a new ZIP for just the theme
            const themeZip = new AdmZip()

            // The format from GitHub is: repo-branch/themeName/...
            // We need to find entries that match this pattern
            const pattern = new RegExp(`[^/]+\/${themeName}\/`)

            entries.forEach((entry) => {
                if (entry.entryName.match(pattern)) {
                    // Remove the repository prefix from the path
                    const relativePath = entry.entryName.replace(/[^/]+\//, "")

                    if (!entry.isDirectory) {
                        themeZip.addFile(relativePath, entry.getData())
                    }
                }
            })

            return themeZip.toBuffer()
        } catch (error) {
            console.error("Theme extraction error:", error)
            throw error
        }
    }

    /**
     * Get metadata about the marketplace
     */
    async getMarketplaceMetadata() {
        try {
            const response = await fetch(`${this.cdnBaseUrl}/metadata.json`)

            if (!response.ok) {
                throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error fetching metadata:", error)
            return {
                generatedAt: new Date().toISOString(),
                totalThemes: 0,
                categories: 0,
                error: "Failed to load metadata",
            }
        }
    }

    /**
     * Search themes (client-side filtering)
     */
    searchThemes(query, themes) {
        if (!query) return themes

        const lowercaseQuery = query.toLowerCase()

        return themes.filter(
            (theme) =>
                theme.title.toLowerCase().includes(lowercaseQuery) ||
                theme.description.toLowerCase().includes(lowercaseQuery) ||
                theme.author.toLowerCase().includes(lowercaseQuery) ||
                (theme.tags && theme.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)))
        )
    }

    /**
     * Filter themes by category
     */
    filterByCategory(category, themes) {
        if (!category) return themes

        return themes.filter((theme) => theme.tags && theme.tags.includes(category))
    }

    /**
     * Sort themes by various criteria
     */
    sortThemes(sortBy, themes) {
        const sorted = [...themes]

        switch (sortBy) {
            case "name":
                return sorted.sort((a, b) => a.title.localeCompare(b.title))
            case "date":
                return sorted.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
            case "version":
                return sorted.sort((a, b) => this.compareVersions(b.version, a.version))
            default:
                return sorted
        }
    }

    /**
     * Compare version strings
     */
    compareVersions(a, b) {
        const partsA = a.split(".").map(Number)
        const partsB = b.split(".").map(Number)

        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
            const numA = partsA[i] || 0
            const numB = partsB[i] || 0

            if (numA > numB) return 1
            if (numA < numB) return -1
        }

        return 0
    }
}
