/**
 * Sets up API routes for user management
 * @param {Object} app - LiteNode app instance
 * @param {Object} options - Configuration options
 */
export function setupUserApi(app, systems) {
    const { authManager, authenticate } = systems

    // Login endpoint
    app.post("/api/auth/login", async (req, res) => {
        try {
            const { username, password } = req.body

            if (!username || !password) {
                return res.status(400).json({ success: false, error: "Username and password are required" })
            }

            const result = await authManager.authenticateUser(username, password)

            if (!result) {
                return res.status(401).json({ success: false, error: "Invalid username or password" })
            }

            res.json({
                success: true,
                data: {
                    user: result.user,
                    token: result.token,
                    expiresAt: result.expiresAt,
                },
            })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Logout endpoint
    app.post("/api/auth/logout", async (req, res) => {
        try {
            const token = req.headers.authorization?.split(" ")[1]

            if (!token) {
                return res.status(400).json({ success: false, error: "No token provided" })
            }

            const success = await authManager.invalidateToken(token)

            if (!success) {
                return res.status(400).json({ success: false, error: "Invalid token" })
            }

            res.json({ success: true })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Get current user
    app.get("/api/users/me", authenticate, async (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, error: "Not authenticated" })
            }

            res.json({ success: true, data: req.user })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Get all users
    app.get("/api/users", authenticate, async (req, res) => {
        try {
            // Only admins can see all users
            if (req.user?.role !== "admin") {
                return res.status(403).json({ success: false, error: "Forbidden" })
            }

            const users = await authManager.getUsers()
            res.json({ success: true, data: users })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Get a specific user
    app.get("/api/users/:id", authenticate, async (req, res) => {
        try {
            // Only admins can see other users, or users can see themselves
            if (req.user?.role !== "admin" && req.user?.id !== req.params.id) {
                return res.status(403).json({ success: false, error: "Forbidden" })
            }

            const user = await authManager.getUser(req.params.id)

            if (!user) {
                return res.status(404).json({ success: false, error: "User not found" })
            }

            res.json({ success: true, data: user })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Create a new user
    app.post("/api/users", authenticate, async (req, res) => {
        try {
            // Only admins can create users
            if (req.user?.role !== "admin") {
                return res.status(403).json({ success: false, error: "Forbidden" })
            }

            const userData = req.body

            // Validate required fields
            if (!userData.username || !userData.password || !userData.email) {
                return res.status(400).json({ success: false, error: "Username, password, and email are required" })
            }

            const user = await authManager.createUser(userData)
            res.status(201).json({ success: true, data: user })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Update a user
    app.put("/api/users/:id", authenticate, async (req, res) => {
        try {
            // Only admins can update other users, or users can update themselves
            if (req.user?.role !== "admin" && req.user?.id !== req.params.id) {
                return res.status(403).json({ success: false, error: "Forbidden" })
            }

            // Only admins can change roles
            if (req.body.role && req.user?.role !== "admin") {
                return res.status(403).json({ success: false, error: "Forbidden" })
            }

            const userData = req.body
            const user = await authManager.updateUser(req.params.id, userData)

            if (!user) {
                return res.status(404).json({ success: false, error: "User not found" })
            }

            res.json({ success: true, data: user })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })

    // Delete a user
    app.delete("/api/users/:id", authenticate, async (req, res) => {
        try {
            // Get the user id to delete from the request body
            const id = req.body

            // Only admins can delete users
            if (req.user?.role !== "admin") {
                return res.status(403).json({ success: false, error: "Forbidden" })
            }

            // Prevent users from deleting themselves
            if (req.user?.id === id) {
                return res.status(400).json({ success: false, error: "Cannot delete your own account" })
            }

            const success = await authManager.deleteUser(id)

            if (!success) {
                return res.status(404).json({ success: false, error: "User not found" })
            }

            res.json({ success: true })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    })
}
