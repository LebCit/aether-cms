/**
 * Handles document-specific operations
 */
import { join } from "node:path"
import { listFiles } from "../utils/file-utils.js"
import { extractIdFromFilename } from "../utils/path-utils.js"

export class DocumentHandler {
    /**
     * @param {Object} fileManager - FileManager instance
     * @param {Object} metadataManager - MetadataManager instance
     * @param {string} baseDir - Base directory for file storage
     */
    constructor(fileManager, metadataManager, baseDir) {
        this.fileManager = fileManager
        this.metadataManager = metadataManager
        this.baseDir = baseDir
        this.documentsDir = join(baseDir, "documents")
    }

    /**
     * Save a document file
     * @param {Buffer|string} documentData - Document data
     * @param {string} filename - Original filename
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Document file information
     */
    async saveDocument(documentData, filename, metadata = {}) {
        try {
            // Save the file using the file manager
            const fileInfo = await this.fileManager.saveFile(documentData, filename, "document")

            // Add document-specific metadata
            const documentMetadata = {
                ...metadata,
                description: metadata.description || "",
                title: metadata.title || filename.split(".")[0],
            }

            // Save metadata
            if (Object.keys(documentMetadata).length > 0) {
                await this.metadataManager.saveMetadata("document", fileInfo.filename, documentMetadata)
            }

            // Return file info with metadata
            return {
                ...fileInfo,
                ...documentMetadata,
            }
        } catch (error) {
            console.error("Error saving document:", error)
            throw error
        }
    }

    /**
     * Get all documents
     * @returns {Promise<Array>} Array of document information
     */
    async getDocuments() {
        try {
            // Get list of files
            const files = await listFiles(this.documentsDir)

            // Filter out metadata files
            const actualFiles = files.filter((filename) => !filename.endsWith(".metadata.json"))

            // Get information for each file
            const filesInfo = await Promise.all(
                actualFiles.map(async (filename) => {
                    try {
                        // Get file stats
                        const { stat } = await import("node:fs/promises")
                        const filePath = join(this.documentsDir, filename)
                        const fileStats = await stat(filePath)

                        // Get metadata
                        const metadata = await this.metadataManager.getMetadata("document", filename)

                        // Get ID from filename
                        const id = extractIdFromFilename(filename)

                        // Return file info
                        return {
                            id,
                            filename,
                            path: filePath,
                            url: `/documents/${filename}`,
                            size: fileStats.size,
                            type: "document",
                            createdAt: metadata.createdAt || fileStats.birthtime.toISOString(),
                            modifiedAt: fileStats.mtime.toISOString(),
                            ...metadata,
                        }
                    } catch (error) {
                        console.error(`Error processing document ${filename}:`, error)
                        return null
                    }
                })
            )

            // Filter out nulls (from errors)
            return filesInfo.filter((info) => info !== null)
        } catch (error) {
            console.error("Error getting documents:", error)
            return []
        }
    }

    /**
     * Update document metadata
     * @param {string} filename - Document filename
     * @param {Object} metadata - Metadata updates
     * @returns {Promise<Object>} Updated document info
     */
    async updateDocument(filename, metadata) {
        try {
            // Update metadata
            const updatedMetadata = await this.metadataManager.updateMetadata("document", filename, metadata)

            // Get file stats
            const { stat } = await import("node:fs/promises")
            const filePath = join(this.documentsDir, filename)
            const fileStats = await stat(filePath)

            // Get ID from filename
            const id = extractIdFromFilename(filename)

            // Return updated file info
            return {
                id,
                filename,
                path: filePath,
                url: `/documents/${filename}`,
                size: fileStats.size,
                type: "document",
                modifiedAt: fileStats.mtime.toISOString(),
                ...updatedMetadata,
            }
        } catch (error) {
            console.error(`Error updating document ${filename}:`, error)
            return null
        }
    }

    /**
     * Delete a document
     * @param {string} filename - Document filename
     * @returns {Promise<boolean>} Success or failure
     */
    async deleteDocument(filename) {
        try {
            // Delete the file
            const success = await this.fileManager.deleteFile(filename, "document")

            // Also delete metadata if file deletion was successful
            if (success) {
                await this.metadataManager.deleteMetadata("document", filename)
            }

            return success
        } catch (error) {
            console.error(`Error deleting document ${filename}:`, error)
            return false
        }
    }

    /**
     * Get a document stream
     * @param {string} filename - Document filename
     * @returns {ReadStream} Document file stream
     */
    getDocumentStream(filename) {
        return this.fileManager.getFileStream(filename, "document")
    }
}
