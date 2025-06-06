import { createAetherBarHtml } from "./aether-bar-utils.js"

/**
 * Prepares template data with common properties
 * @param {Object} req - The request object
 * @param {Object} themeManager - The theme manager instance
 * @param {Object} siteSettings - The site settings
 * @param {Object} additionalData - Additional template data
 * @returns {Object} The prepared template data
 */
export async function prepareTemplateData(req, themeManager, siteSettings, additionalData = {}) {
    const activeTheme = themeManager.getActiveTheme()

    // Create admin components injection if user has edit permissions
    let aetherBarInjection = ""

    if (req.isEditable) {
        // Prepare content data if available
        const contentData = additionalData.contentId
            ? {
                  id: additionalData.contentId,
                  type: additionalData.fileType || "",
                  metadata: additionalData.metadata || {},
              }
            : null

        // Create admin components HTML
        const aetherBarComponents = createAetherBarHtml({
            userData: req.currentUser,
            contentData: contentData,
            environment: process.env.NODE_ENV || "development",
        })

        aetherBarInjection = aetherBarComponents.html
    }

    const baseData = {
        site: siteSettings,
        theme: activeTheme,
        editable: req.isEditable,
        currentUser: req.currentUser,
        aetherBar: aetherBarInjection,
        ...additionalData,
    }

    // Add menu data to template
    return await themeManager.addMenuToTemplateData(baseData)
}

/**
 * Process template data through hooks
 * @param {Object} hookSystem - The hook system instance
 * @param {Object} data - The template data
 * @param {string} templateName - The template name
 * @returns {Object} The processed template data
 */
export function processTemplateData(hookSystem, data, templateName) {
    return hookSystem.applyFilters("template_data", data, templateName)
}

/**
 * Handle 404 Not Found for routes
 * @param {Object} res - Response object
 * @param {Object} req - Request object
 * @param {Object} themeManager - Theme manager instance
 * @param {Object} settingsService - Settings service instance
 */
export async function handle404(res, req, themeManager, settingsService) {
    try {
        const activeTheme = themeManager.getActiveTheme()
        const templatePath = themeManager.getTemplatePath("layout.html")
        const siteSettings = await settingsService.getSettings()

        const data = {
            site: siteSettings,
            theme: activeTheme,
            notFoundRoute: true,
            metadata: {
                title: "404 - The Page You're Looking For Doesn't Exist",
                description:
                    "The page you were looking for could not be found. It may have been moved or deleted. Please check the URL or return to the homepage.",
            },
            editable: req.isEditable,
            currentUser: req.currentUser,
            year: new Date().getFullYear(),
        }

        // Add menu data to template
        const dataWithMenu = await themeManager.addMenuToTemplateData(data)

        res.status(404).render(templatePath, dataWithMenu)
    } catch (err) {
        res.status(404).html("<h1>404 - The Page You're Looking For Doesn't Exist</h1>")
    }
}

/**
 * Handle 500 Server Error for routes
 * @param {Object} res - Response object
 * @param {Object} req - Request object
 * @param {Object} themeManager - Theme manager instance
 * @param {Object} settingsService - Settings service instance
 */
export async function handle500(res, req, themeManager, settingsService) {
    try {
        const activeTheme = themeManager.getActiveTheme()
        const templatePath = themeManager.getTemplatePath("layout.html")
        const siteSettings = await settingsService.getSettings()

        const data = {
            site: siteSettings,
            theme: activeTheme,
            serverErrorRoute: true,
            metadata: {
                title: "500 - Internal Server Error",
                description:
                    "Something went wrong on our end. We're working to fix the issue as quickly as possible. Please try again later or return to the homepage.",
            },
            editable: req.isEditable,
            currentUser: req.currentUser,
            year: new Date().getFullYear(),
        }

        // Add menu data to template
        const dataWithMenu = await themeManager.addMenuToTemplateData(data)

        res.status(500).render(templatePath, dataWithMenu)
    } catch (err) {
        res.status(500).html("<h1>500 - Internal Server Error</h1>")
    }
}
