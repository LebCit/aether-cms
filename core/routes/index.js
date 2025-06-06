import { setupHomeRoutes } from "./home.js"
import { setupContentRoutes } from "./content.js"
import { setupTaxonomyRoutes } from "./taxonomy.js"
import { setupCustomRoutes } from "./custom.js"
import { setupSeoRoutes } from "./seo.js"

export function setupFrontendRoutes(app, systems) {
    // Set up all frontend routes
    setupHomeRoutes(app, systems)
    setupContentRoutes(app, systems)
    setupTaxonomyRoutes(app, systems)
    setupCustomRoutes(app, systems)
    setupSeoRoutes(app, systems)
}
