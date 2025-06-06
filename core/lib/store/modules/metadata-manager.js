/**
 * Manages file metadata
 */
import { join } from "node:path"
import { existsSync } from "node:fs"
import { readJsonFile, writeJsonFile } from "../utils/file-utils.js"

export class MetadataManager {
    /**
     * @param {string} baseDir - Base directory for file storage
     */
    constructor(baseDir) {
        this.baseDir = baseDir
    }

    /**
     * Get metadata file path for a file
     * @param {string} type - File type ('image' or 'document')
     * @param {string} filename - Filename
     * @returns {string} Path to the metadata file
     */
    getMetadataPath(type, filename) {
        const typeDir = type === "image" ? "images" : "documents"
        return join(this.baseDir, typeDir, `${filename}.metadata.json`)
    }

    /**
     * Save metadata for a file
     * @param {string} type - File type ('image' or 'document')
     * @param {string} filename - Filename
     * @param {Object} metadata - Metadata to save
     * @returns {Promise<boolean>} Success or failure
     */
    async saveMetadata(type, filename, metadata) {
        try {
            const metadataPath = this.getMetadataPath(type, filename)

            // Add timestamps if not present
            if (!metadata.createdAt) {
                metadata.createdAt = new Date().toISOString()
            }

            metadata.updatedAt = new Date().toISOString()

            return await writeJsonFile(metadataPath, metadata)
        } catch (error) {
            console.error(`Error saving metadata for ${filename}:`, error)
            return false
        }
    }

    /**
     * Get metadata for a file
     * @param {string} type - File type ('image' or 'document')
     * @param {string} filename - Filename
     * @returns {Promise<Object>} File metadata
     */
    async getMetadata(type, filename) {
        try {
            const metadataPath = this.getMetadataPath(type, filename)

            if (existsSync(metadataPath)) {
                return await readJsonFile(metadataPath, {})
            }

            return {}
        } catch (error) {
            console.error(`Error getting metadata for ${filename}:`, error)
            return {}
        }
    }

    /**
     * Update metadata for a file
     * @param {string} type - File type ('image' or 'document')
     * @param {string} filename - Filename
     * @param {Object} updates - Metadata updates
     * @returns {Promise<Object>} Updated metadata
     */
    async updateMetadata(type, filename, updates) {
        try {
            // Get existing metadata
            const existingMetadata = await this.getMetadata(type, filename)

            // Merge with updates
            const updatedMetadata = {
                ...existingMetadata,
                ...updates,
                updatedAt: new Date().toISOString(),
            }

            // Save updated metadata
            await this.saveMetadata(type, filename, updatedMetadata)

            return updatedMetadata
        } catch (error) {
            console.error(`Error updating metadata for ${filename}:`, error)
            return {}
        }
    }

    /**
     * Delete metadata for a file
     * @param {string} type - File type ('image' or 'document')
     * @param {string} filename - Filename
     * @returns {Promise<boolean>} Success or failure
     */
    async deleteMetadata(type, filename) {
        const metadataPath = this.getMetadataPath(type, filename)

        try {
            if (existsSync(metadataPath)) {
                const { unlink } = await import("node:fs/promises")
                await unlink(metadataPath)
                return true
            }
            return true // Consider it a success if the file doesn't exist
        } catch (error) {
            console.error(`Error deleting metadata for ${filename}:`, error)
            return false
        }
    }
}
