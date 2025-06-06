/**
 * Static Site Generator Module
 * Handles the static site generation UI functionality
 */

export function initStaticGenerator() {
    // Get DOM elements
    const generateBtn = document.getElementById("generateStaticBtn")
    const statusDiv = document.getElementById("staticGeneratorStatus")
    const resultDiv = document.getElementById("staticGeneratorResult")

    if (!generateBtn) return // Exit if elements don't exist (tab not shown)

    // Add event listener to generate button
    generateBtn.addEventListener("click", async function () {
        // Get form values
        const outputDir = document.getElementById("staticOutputDir").value.trim()
        const baseUrl = document.getElementById("staticBaseUrl").value.trim()
        const cleanUrls = document.getElementById("staticCleanUrls").checked

        // Validate form
        if (!outputDir) {
            showResult("Please enter an output directory", "danger")
            return
        }

        // Disable button and show status
        generateBtn.disabled = true
        statusDiv.style.display = "block"
        resultDiv.style.display = "none"

        try {
            // Call API
            const response = await fetch("/api/static/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    outputDir,
                    baseUrl,
                    cleanUrls,
                }),
            })

            const data = await response.json()

            if (data.success) {
                // Show success message but keep status indicator
                // since generation is happening in background
                setTimeout(() => {
                    checkGenerationStatus()
                }, 2000)
            } else {
                // Show error message
                showResult(data.error || "Failed to generate static site", "danger")
                statusDiv.style.display = "none"
                generateBtn.disabled = false
            }
        } catch (error) {
            console.error("Error generating static site:", error)
            showResult("An error occurred while generating the static site", "danger")
            statusDiv.style.display = "none"
            generateBtn.disabled = false
        }
    })

    // Function to check generation status
    async function checkGenerationStatus() {
        try {
            const response = await fetch("/api/static/status")
            const data = await response.json()

            if (data.success && data.status === "ready") {
                // Generation complete
                showResult(
                    "Static site generated successfully! You can find the files in the <strong>" +
                        document.getElementById("staticOutputDir").value.trim() +
                        "</strong> directory.",
                    "success"
                )
                statusDiv.style.display = "none"
                generateBtn.disabled = false
            } else if (data.success && data.status === "generating") {
                // Still generating, check again later
                setTimeout(checkGenerationStatus, 2000)
            } else {
                // Error occurred
                showResult(data.error || "Failed to generate static site", "danger")
                statusDiv.style.display = "none"
                generateBtn.disabled = false
            }
        } catch (error) {
            console.error("Error checking generation status:", error)
            // Assume generation is complete to unblock UI
            showResult("Static site generation may have completed, but status check failed", "warning")
            statusDiv.style.display = "none"
            generateBtn.disabled = false
        }
    }

    // Function to show result
    function showResult(message, type = "success") {
        resultDiv.innerHTML = message
        resultDiv.className = `alert alert-${type} mt-3`
        resultDiv.style.display = "block"
    }
}
