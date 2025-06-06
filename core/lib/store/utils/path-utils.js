/**
 * Utilities for path management and normalization
 */
import { extname, basename, join } from "node:path"

/**
 * Normalize a filename by removing special characters and spaces
 * @param {string} filename - Original filename
 * @returns {string} Normalized filename
 */
export function normalizeFilename(filename) {
    // Get extension and base name
    const ext = extname(filename)
    let baseName = basename(filename, ext)

    // Normalize the base name:
    // 1. Convert to lowercase
    // 2. Remove special characters
    // 3. Replace spaces and multiple dashes with single dash
    baseName = baseName
        .toLowerCase()
        .replace(/[^\w\s-]/g, "") // Remove non-word chars (except spaces and dashes)
        .replace(/[\s_]+/g, "-") // Replace spaces and underscores with dashes
        .replace(/--+/g, "-") // Replace multiple dashes with single dash
        .replace(/^-+|-+$/g, "") // Remove leading/trailing dashes

    // Return normalized filename with original extension
    return baseName + ext.toLowerCase()
}

/**
 * Build a path for a file based on its type
 * @param {Object} options - Options for building the path
 * @param {string} options.baseDir - Base directory
 * @param {string} options.type - File type ('image' or 'document')
 * @param {string} options.filename - Filename
 * @returns {string} The full file path
 */
export function buildFilePath({ baseDir, type, filename }) {
    const typeDir = type === "image" ? "images" : "documents"
    return join(baseDir, typeDir, filename)
}

/**
 * Generate a public URL for a file
 * @param {string} type - File type ('image' or 'document')
 * @param {string} filename - Filename
 * @returns {string} Public URL for the file
 */
export function generateFileUrl(type, filename) {
    const typeDir = type === "image" ? "images" : "documents"
    return `/${typeDir}/${filename}`
}

/**
 * Extract unique ID from a filename
 * @param {string} filename - Filename that includes a unique ID
 * @returns {string} Extracted unique ID or the filename itself
 */
export function extractIdFromFilename(filename) {
    const ext = extname(filename)
    const filenameWithoutExt = basename(filename, ext)
    const lastDashIndex = filenameWithoutExt.lastIndexOf("-")
    return lastDashIndex !== -1 ? filenameWithoutExt.slice(lastDashIndex + 1) : filenameWithoutExt
}
