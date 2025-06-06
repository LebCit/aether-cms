/**
 * Manages core file operations
 */
import { join } from "node:path"
import { randomBytes } from "node:crypto"
import { ensureDirectory, saveFile, deleteFile, getFileStream, getFileStats } from "../utils/file-utils.js"
import { normalizeFilename, buildFilePath, generateFileUrl } from "../utils/path-utils.js"

export class FileManager {
    /**
     * @param {string} baseDir - Base directory for file storage
     */
    constructor(baseDir) {
        this.baseDir = baseDir
        this.imagesDir = join(baseDir, "images")
        this.documentsDir = join(baseDir, "documents")
    }

    /**
     * Initialize storage directories
     */
    async initialize() {
        try {
            // Create directories if they don't exist
            await ensureDirectory(this.baseDir)
            await ensureDirectory(this.imagesDir)
            await ensureDirectory(this.documentsDir)
            return true
        } catch (error) {
            console.error("Error initializing file storage:", error)
            return false
        }
    }

    /**
     * Generate a unique filename
     * @param {string} originalFilename - Original filename
     * @returns {Object} Object containing normalized and unique filenames
     */
    generateUniqueFilename(originalFilename) {
        // Normalize the filename
        const normalizedFilename = normalizeFilename(originalFilename)

        // Generate a unique ID
        const uniqueId = randomBytes(8).toString("hex")

        // Get extension and base name
        const parts = normalizedFilename.split(".")
        const ext = parts.length > 1 ? `.${parts.pop()}` : ""
        const baseName = parts.join(".")

        // Create unique filename
        const uniqueFilename = `${baseName}-${uniqueId}${ext}`

        return {
            normalizedFilename,
            uniqueFilename,
            uniqueId,
        }
    }

    /**
     * Save a file
     * @param {Buffer|string} fileData - File data to save
     * @param {string} originalFilename - Original filename
     * @param {string} type - File type ('image' or 'document')
     * @returns {Promise<Object>} File information
     */
    async saveFile(fileData, originalFilename, type = "image") {
        try {
            // Generate a unique filename
            const { uniqueFilename, uniqueId } = this.generateUniqueFilename(originalFilename)

            // Build file path
            const filePath = buildFilePath({ baseDir: this.baseDir, type, filename: uniqueFilename })

            // Save the file
            await saveFile(filePath, fileData)

            // Get file stats
            const fileStats = await getFileStats(filePath)

            // Return file info
            return {
                id: uniqueId,
                filename: uniqueFilename,
                originalFilename,
                path: filePath,
                url: generateFileUrl(type, uniqueFilename),
                size: fileStats ? fileStats.size : 0,
                type,
                createdAt: new Date().toISOString(),
            }
        } catch (error) {
            console.error(`Error saving ${type} file:`, error)
            throw new Error(`Failed to save file: ${error.message}`)
        }
    }

    /**
     * Get a file stream
     * @param {string} filename - Filename
     * @param {string} type - File type ('image' or 'document')
     * @returns {ReadStream} File stream
     */
    getFileStream(filename, type = "image") {
        // Build file path
        const filePath = buildFilePath({ baseDir: this.baseDir, type, filename })

        // Return a read stream for the file
        return getFileStream(filePath)
    }

    /**
     * Delete a file
     * @param {string} filename - Filename
     * @param {string} type - File type ('image' or 'document')
     * @returns {Promise<boolean>} Success or failure
     */
    async deleteFile(filename, type = "image") {
        try {
            // Build file path
            const filePath = buildFilePath({ baseDir: this.baseDir, type, filename })

            // Delete the file
            return await deleteFile(filePath)
        } catch (error) {
            console.error(`Error deleting ${type} file:`, error)
            return false
        }
    }
}
