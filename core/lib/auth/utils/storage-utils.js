/**
 * Utility functions for storage operations
 */
import { readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"

/**
 * Reads a JSON file and parses its contents
 * @param {string} filePath - Path to the JSON file
 * @param {Object} defaultValue - Default value to return if file doesn't exist
 * @returns {Promise<Object>} Parsed JSON data or default value
 */
export async function readJsonFile(filePath, defaultValue = {}) {
    try {
        if (existsSync(filePath)) {
            const data = await readFile(filePath, "utf8")

            // Check if file is empty or whitespace only
            if (!data || data.trim() === "") {
                return defaultValue
            }

            try {
                return JSON.parse(data)
            } catch (jsonError) {
                console.error("Invalid JSON in file, resetting to default value", jsonError)
                return defaultValue
            }
        }
        return defaultValue
    } catch (error) {
        console.error(`Error reading JSON file ${filePath}:`, error)
        return defaultValue
    }
}

/**
 * Writes data to a JSON file
 * @param {string} filePath - Path to write the JSON file
 * @param {Object} data - Data to write
 * @returns {Promise<boolean>} Success or failure
 */
export async function writeJsonFile(filePath, data) {
    try {
        await writeFile(filePath, JSON.stringify(data, null, 2), "utf8")
        return true
    } catch (error) {
        console.error(`Error writing JSON file ${filePath}:`, error)
        return false
    }
}
