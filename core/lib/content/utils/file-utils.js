/**
 * File operation utilities for content management
 */
import { readdir, readFile, writeFile, mkdir, unlink } from "node:fs/promises"
import { join } from "node:path"
import { existsSync } from "node:fs"

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path to ensure exists
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
 * Read and parse a JSON file
 * @param {string} filePath - Path to JSON file
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
 * Write an object to a JSON file
 * @param {string} filePath - Path to write JSON file
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

/**
 * Get all markdown files from a directory
 * @param {string} dirPath - Directory to scan
 * @param {Function} parseMarkdownFn - Function to parse markdown files
 * @returns {Promise<Array>} Array of parsed content objects
 */
export async function getMarkdownFiles(dirPath, parseMarkdownFn) {
    try {
        if (!existsSync(dirPath)) {
            return []
        }

        const files = await readdir(dirPath)
        const contentItems = []

        for (const file of files) {
            if (!file.endsWith(".md")) continue

            const filePath = join(dirPath, file)
            const content = await parseMarkdownFn(filePath)

            if (content) {
                contentItems.push(content)
            }
        }

        return contentItems
    } catch (error) {
        console.error(`Error getting markdown files from ${dirPath}:`, error)
        return []
    }
}

/**
 * Find a specific markdown file in a directory by matching a property
 * @param {string} dirPath - Directory to search
 * @param {Function} parseMarkdownFn - Function to parse markdown files
 * @param {string} property - Property to match
 * @param {any} value - Value to match
 * @returns {Promise<Object>} Found file path and content, or null if not found
 */
export async function findMarkdownFileByProperty(dirPath, parseMarkdownFn, property, value) {
    try {
        if (!existsSync(dirPath)) {
            return null
        }

        const files = await readdir(dirPath)

        for (const file of files) {
            if (!file.endsWith(".md")) continue

            const filePath = join(dirPath, file)
            const content = await parseMarkdownFn(filePath)

            if (content.frontmatter && content.frontmatter[property] === value) {
                return { filePath, content }
            }
        }

        return null
    } catch (error) {
        console.error(`Error finding markdown file by ${property}=${value}:`, error)
        return null
    }
}

/**
 * Write a markdown file with frontmatter and content
 * @param {string} filePath - Path to write markdown file
 * @param {string} yamlFrontmatter - YAML frontmatter
 * @param {string} content - Markdown content
 * @returns {Promise<boolean>} Success or failure
 */
export async function writeMarkdownFile(filePath, yamlFrontmatter, content) {
    try {
        const markdownContent = `---\n${yamlFrontmatter}---\n\n${content}`
        await writeFile(filePath, markdownContent, "utf8")
        return true
    } catch (error) {
        console.error(`Error writing markdown file ${filePath}:`, error)
        return false
    }
}

/**
 * Delete a file
 * @param {string} filePath - Path to file to delete
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
