import { LiteNode } from "litenode"

// Import core application
import { setupApp } from "./core/app.js"

// Create LiteNode instance
const app = new LiteNode("./", "./")

// Load environment variables
app.loadEnv()

// Initialize the CMS
setupApp(app, {
    rootDir: "./",
    contentDir: "content",
    uploadsDir: "content/uploads",
    themesDir: "content/themes",
    dataDir: "content/data",
})

// Start the server
const PORT = app.getEnv("PORT", 8080)
app.startServer(PORT)
