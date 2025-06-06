/**
 * Handles image-specific operations
 */
import { join } from "node:path"
import { listFiles } from "../utils/file-utils.js"
import { extractIdFromFilename } from "../utils/path-utils.js"

export class ImageHandler {
    /**
     * @param {Object} fileManager - FileManager instance
     * @param {Object} metadataManager - MetadataManager instance
     * @param {string} baseDir - Base directory for file storage
     */
    constructor(fileManager, metadataManager, baseDir) {
        this.fileManager = fileManager
        this.metadataManager = metadataManager
        this.baseDir = baseDir
        this.imagesDir = join(baseDir, "images")
    }

    /**
     * Save an image file
     * @param {Buffer|string} imageData - Image data
     * @param {string} filename - Original filename
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Image file information
     */
    async saveImage(imageData, filename, metadata = {}) {
        try {
            // Save the file using the file manager
            const fileInfo = await this.fileManager.saveFile(imageData, filename, "image")

            // Add image-specific metadata
            const imageMetadata = {
                ...metadata,
                alt: metadata.alt || filename, // Default alt text
                width: metadata.width,
                height: metadata.height,
            }

            // Save metadata
            if (Object.keys(imageMetadata).length > 0) {
                await this.metadataManager.saveMetadata("image", fileInfo.filename, imageMetadata)
            }

            // Return file info with metadata
            return {
                ...fileInfo,
                ...imageMetadata,
            }
        } catch (error) {
            console.error("Error saving image:", error)
            throw error
        }
    }

    /**
     * Get all images
     * @returns {Promise<Array>} Array of image information
     */
    async getImages() {
        try {
            // Get list of files
            const files = await listFiles(this.imagesDir)

            // Filter out metadata files
            const actualFiles = files.filter((filename) => !filename.endsWith(".metadata.json"))

            // Get information for each file
            const filesInfo = await Promise.all(
                actualFiles.map(async (filename) => {
                    try {
                        // Get file stats
                        const { stat } = await import("node:fs/promises")
                        const filePath = join(this.imagesDir, filename)
                        const fileStats = await stat(filePath)

                        // Get metadata
                        const metadata = await this.metadataManager.getMetadata("image", filename)

                        // Get ID from filename
                        const id = extractIdFromFilename(filename)

                        // Return file info
                        return {
                            id,
                            filename,
                            path: filePath,
                            url: `/images/${filename}`,
                            size: fileStats.size,
                            type: "image",
                            createdAt: metadata.createdAt || fileStats.birthtime.toISOString(),
                            modifiedAt: fileStats.mtime.toISOString(),
                            ...metadata,
                        }
                    } catch (error) {
                        console.error(`Error processing image ${filename}:`, error)
                        return null
                    }
                })
            )

            // Filter out nulls (from errors)
            return filesInfo.filter((info) => info !== null)
        } catch (error) {
            console.error("Error getting images:", error)
            return []
        }
    }

    /**
     * Update image metadata
     * @param {string} filename - Image filename
     * @param {Object} metadata - Metadata updates
     * @returns {Promise<Object>} Updated image info
     */
    async updateImage(filename, metadata) {
        try {
            // Update metadata
            const updatedMetadata = await this.metadataManager.updateMetadata("image", filename, metadata)

            // Get file stats
            const { stat } = await import("node:fs/promises")
            const filePath = join(this.imagesDir, filename)
            const fileStats = await stat(filePath)

            // Get ID from filename
            const id = extractIdFromFilename(filename)

            // Return updated file info
            return {
                id,
                filename,
                path: filePath,
                url: `/images/${filename}`,
                size: fileStats.size,
                type: "image",
                modifiedAt: fileStats.mtime.toISOString(),
                ...updatedMetadata,
            }
        } catch (error) {
            console.error(`Error updating image ${filename}:`, error)
            return null
        }
    }

    /**
     * Delete an image
     * @param {string} filename - Image filename
     * @returns {Promise<boolean>} Success or failure
     */
    async deleteImage(filename) {
        try {
            // Delete the file
            const success = await this.fileManager.deleteFile(filename, "image")

            // Also delete metadata if file deletion was successful
            if (success) {
                await this.metadataManager.deleteMetadata("image", filename)
            }

            return success
        } catch (error) {
            console.error(`Error deleting image ${filename}:`, error)
            return false
        }
    }

    /**
     * Get an image stream
     * @param {string} filename - Image filename
     * @returns {ReadStream} Image file stream
     */
    getImageStream(filename) {
        return this.fileManager.getFileStream(filename, "image")
    }
}
