/**
 * Common file operation utilities
 */
import { mkdir, writeFile, readFile, unlink, readdir, stat } from "node:fs/promises"
import { createReadStream, existsSync } from "node:fs"
import { dirname } from "node:path"

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Path to check/create
 * @returns {Promise<boolean>} Success or failure
 */
export async function ensureDirectory(dirPath) {
    try {
        if (!existsSync(dirPath)) {
            await mkdir(dirPath, { recursive: true })
        }
        return true
    } catch (error) {
        console.error(`Error ensuring directory ${dirPath}:`, error)
        return false
    }
}

/**
 * Save data to a file, ensuring the directory exists
 * @param {string} filePath - Path to save the file
 * @param {Buffer|string} data - Data to write
 * @returns {Promise<boolean>} Success or failure
 */
export async function saveFile(filePath, data) {
    try {
        // Ensure directory exists
        const dir = dirname(filePath)
        await ensureDirectory(dir)

        // Write the file
        await writeFile(filePath, data)
        return true
    } catch (error) {
        console.error(`Error saving file ${filePath}:`, error)
        return false
    }
}

/**
 * Get a read stream for a file
 * @param {string} filePath - Path to the file
 * @returns {ReadStream} Stream for reading the file
 */
export function getFileStream(filePath) {
    return createReadStream(filePath)
}

/**
 * Delete a file if it exists
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} Success or failure
 */
export async function deleteFile(filePath) {
    try {
        if (existsSync(filePath)) {
            await unlink(filePath)
            return true
        }
        return false
    } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error)
        return false
    }
}

/**
 * Read and parse a JSON file
 * @param {string} filePath - Path to the JSON file
 * @param {Object} defaultValue - Default value if file doesn't exist
 * @returns {Promise<Object>} Parsed JSON or default value
 */
export async function readJsonFile(filePath, defaultValue = {}) {
    try {
        if (existsSync(filePath)) {
            const data = await readFile(filePath, "utf8")
            return JSON.parse(data)
        }
        return defaultValue
    } catch (error) {
        console.error(`Error reading JSON file ${filePath}:`, error)
        return defaultValue
    }
}

/**
 * Write data to a JSON file
 * @param {string} filePath - Path to write the JSON file
 * @param {Object} data - Data to write
 * @returns {Promise<boolean>} Success or failure
 */
export async function writeJsonFile(filePath, data) {
    try {
        const jsonData = JSON.stringify(data, null, 2)
        return await saveFile(filePath, jsonData)
    } catch (error) {
        console.error(`Error writing JSON file ${filePath}:`, error)
        return false
    }
}

/**
 * Get file stats
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object|null>} File stats or null if error
 */
export async function getFileStats(filePath) {
    try {
        return await stat(filePath)
    } catch (error) {
        console.error(`Error getting file stats for ${filePath}:`, error)
        return null
    }
}

/**
 * List files in a directory
 * @param {string} dirPath - Directory path
 * @returns {Promise<string[]>} Array of filenames
 */
export async function listFiles(dirPath) {
    try {
        if (!existsSync(dirPath)) {
            return []
        }
        return await readdir(dirPath)
    } catch (error) {
        console.error(`Error listing files in ${dirPath}:`, error)
        return []
    }
}
