/**
 * Creates HTML for the Aether bar to be injected directly into a page
 * @param {Object} options Aether bar configuration options
 * @param {Object} options.userData Current user data
 * @param {Object} options.contentData Info about current content being viewed (optional)
 * @param {string} options.environment Environment name (development, staging, production)
 * @returns {<string>} HTML, CSS and JavaScript for the Aether bar
 */
export function createAetherBarHtml(options = {}) {
    const { userData, contentData, environment } = options

    // Determine if we're on a content page
    const isContentPage = !!(contentData?.type && contentData?.id)

    // Create a data object to pass to the frontend
    const aetherBarData = {
        user: userData || {},
        contentType: contentData?.type || "",
        contentId: contentData?.id || "",
        environment: environment || "development",
        metadata: contentData?.metadata || {},
        isContentPage: isContentPage,
    }

    // Create content-specific buttons if we're on a content page
    let contentButtons = ""
    if (isContentPage) {
        contentButtons = `
        <a href="/aether/${contentData.type}s/edit/${contentData.id}" class="aether-btn">
          <i class="edit-icon"></i>
          Edit
        </a>
        <a href="/aether/table/${contentData.type}s" class="aether-btn">
          <i class="list-icon"></i>
          All ${contentData.type}s
        </a>
      `
    }

    // Create admin-only buttons (conditional display based on role will be handled by JS)
    const adminButtons = `
      <a href="/aether/settings" class="aether-btn aether-only">
        <i class="settings-icon"></i>
        Settings
      </a>
      <a href="/aether/users" class="aether-btn aether-only">
        <i class="users-icon"></i>
        Users
      </a>
    `

    // Create the minimal but complete HTML structure
    return {
        html: `
        <!-- Aether Bar Structure -->
        <div class="aether-bar-horizontal${environment ? ` aether-env-${environment}` : ""}">
          <div class="aether-env-user-info">
            <!-- Environment indicator -->
            ${environment ? `<span class="aether-environment-badge">${environment}</span>` : ""}
          
            <!-- User info -->
            <span class="aether-user-info">
              <i class="admin-icon"></i>
              <span id="username-display">${userData?.username || "[No Username]"}</span> (<span id="role-display">${
            userData?.role || "[No Role]"
        }</span>)
            </span>
            </div>
          
          <!-- Actions menu -->
          <div class="aether-actions" id="aether-actions">
            <!-- Content-specific buttons -->
            ${contentButtons}
            
            <!-- Standard buttons -->
            <a href="/aether/media" class="aether-btn aether-media-btn">
              <i class="media-icon"></i>
              Media
            </a>
            <a href="/aether" class="aether-btn">
              <i class="dashboard-icon"></i>
              Dashboard
            </a>
            
            <!-- Admin-only buttons -->
            ${adminButtons}
          </div>
          
          <!-- Performance indicator -->
          <div class="aether-performance">
            <span class="bd-perf-indicator" title="Page load time"></span>
          </div>
          
          <!-- Info button - only shown for content pages -->
          ${
              isContentPage
                  ? `
          <button class="aether-info-toggle" title="View page info">
            <i class="info-icon"></i>
          </button>
          `
                  : ""
          }
          
          <!-- Logout button -->
          <a href="/aether/logout" class="aether-logout-btn" title="Log out">
            <i class="logout-icon"></i>
          </a>
        </div>
        
        <!-- Information panel - only for content pages -->
        ${
            isContentPage
                ? `
        <div class="aether-info-panel">
          <h4>${
              contentData.type ? contentData.type.charAt(0).toUpperCase() + contentData.type.slice(1) : "Content"
          } Information</h4>
          <ul>
            <li><strong>ID:</strong> ${contentData.id}</li>
            ${
                contentData.metadata
                    ? `
            <li><strong>Created:</strong> ${
                contentData.metadata.createdAt ? new Date(contentData.metadata.createdAt).toLocaleDateString() : "N/A"
            }</li>
            <li><strong>Updated:</strong> ${
                contentData.metadata.updatedAt ? new Date(contentData.metadata.updatedAt).toLocaleDateString() : "N/A"
            }</li>
            <li><strong>Author:</strong> ${contentData.metadata.author || "N/A"}</li>
            <li><strong>Status:</strong> ${contentData.metadata.status || "N/A"}</li>
            <li><strong>Slug:</strong> ${contentData.metadata.slug || "N/A"}</li>
            `
                    : ""
            }
          </ul>
          <div class="aether-info-close">×</div>
        </div>
        `
                : ""
        }
        
        <script>window.aetherBarData = ${JSON.stringify(aetherBarData)};</script>
        <link rel="stylesheet" href="/assets/css/aether-bar.css">
        <script src="/assets/js/aether-bar.js"></script>
      `,
    }
}
