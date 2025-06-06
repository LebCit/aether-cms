/**
 * File operation utilities for theme management
 */
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { createReadStream, existsSync } from "node:fs"

/**
 * Recursively copy a directory
 * @param {string} source - Source directory
 * @param {string} destination - Destination directory
 * @returns {Promise<void>}
 */
export async function copyDirectory(source, destination) {
    // Create destination directory
    await mkdir(destination, { recursive: true })

    // Read directory contents
    const entries = await readdir(source, { withFileTypes: true })

    // Process each entry
    for (const entry of entries) {
        const sourcePath = join(source, entry.name)
        const destPath = join(destination, entry.name)

        if (entry.isDirectory()) {
            // Recursively copy subdirectory
            await copyDirectory(sourcePath, destPath)
        } else {
            // Copy file
            await copyFile(sourcePath, destPath)
        }
    }
}

/**
 * Safely read and parse a JSON file
 * @param {string} filePath - Path to the JSON file
 * @param {Object} defaultValue - Default value if file doesn't exist
 * @returns {Promise<Object>} Parsed JSON or default value
 */
export async function readJsonFile(filePath, defaultValue = {}) {
    try {
        const data = await readFile(filePath, "utf8")
        return JSON.parse(data)
    } catch (error) {
        if (error.code === "ENOENT") {
            return defaultValue
        }
        throw error
    }
}

/**
 * Safely write an object to a JSON file
 * @param {string} filePath - Path to write the JSON file
 * @param {Object} data - Data to write
 * @param {boolean} pretty - Whether to pretty-print the JSON
 * @returns {Promise<boolean>} Success or failure
 */
export async function writeJsonFile(filePath, data, pretty = true) {
    try {
        const dirPath = dirname(filePath)

        // Ensure directory exists
        if (!existsSync(dirPath)) {
            await mkdir(dirPath, { recursive: true })
        }

        const jsonString = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)

        await writeFile(filePath, jsonString, "utf8")
        return true
    } catch (error) {
        console.error(`Error writing JSON file ${filePath}:`, error)
        return false
    }
}

/**
 * Safely delete a directory or file
 * @param {string} path - Path to delete
 * @param {boolean} recursive - Whether to delete recursively
 * @returns {Promise<boolean>} Success or failure
 */
export async function safeDelete(path, recursive = true) {
    try {
        await rm(path, { recursive, force: true })
        return true
    } catch (error) {
        if (error.code === "ENOENT") {
            // Path didn't exist, which is fine
            return true
        }
        console.error(`Error deleting ${path}:`, error)
        return false
    }
}

/**
 * Create a directory if it doesn't exist
 * @param {string} path - Path to create
 * @returns {Promise<boolean>} Success or failure
 */
export async function ensureDirectory(path) {
    try {
        await mkdir(path, { recursive: true })
        return true
    } catch (error) {
        if (error.code === "EEXIST") {
            // Directory already exists, which is fine
            return true
        }
        console.error(`Error creating directory ${path}:`, error)
        return false
    }
}

/**
 * Get a read stream for a file
 * @param {string} filePath - Path to the file
 * @returns {ReadStream} Stream for the file
 */
export function getFileStream(filePath) {
    return createReadStream(filePath)
}
