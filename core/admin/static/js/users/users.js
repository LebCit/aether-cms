/**
 * Users Management Main Entry Point
 */
import { userManager } from "./modules/user-manager.js"

document.addEventListener("DOMContentLoaded", function () {
    // Initialize the user manager
    userManager.init()
})
