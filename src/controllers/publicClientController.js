import { sql } from "../config/db.js";

// Get client by slug (public endpoint)
export const getClientBySlug = async (req, res) => {
    try {
        const { slug } = req.body;

        if (!slug) {
            return res.status(400).json({ error: "slug is required" });
        }

        // Get client by slug
        const client = await sql`
            SELECT client_id, name, slug, password 
            FROM clients 
            WHERE slug = ${slug} AND status = 'active'
        `;

        if (client.length === 0) {
            return res.status(404).json({ error: "Client not found" });
        }

        res.json({ 
            client: {
                client_id: client[0].client_id,
                name: client[0].name,
                slug: client[0].slug,
                password: client[0].password || ''
            }
        });
    } catch (error) {
        console.error("Error getting client by slug:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Verify client password (public endpoint)
export const verifyClientPassword = async (req, res) => {
    try {
        const { slug, password } = req.body;

        if (!slug || !password) {
            return res.status(400).json({ error: "slug and password are required" });
        }

        // Get client by slug and verify password
        const client = await sql`
            SELECT client_id, name, slug, password 
            FROM clients 
            WHERE slug = ${slug} AND status = 'active'
        `;

        if (client.length === 0) {
            return res.status(404).json({ error: "Client not found" });
        }

        // Check if password matches
        if (client[0].password !== password) {
            return res.status(401).json({ error: "Invalid password" });
        }

        // Return client data without password
        res.json({ 
            success: true,
            client: {
                client_id: client[0].client_id,
                name: client[0].name,
                slug: client[0].slug
            }
        });
    } catch (error) {
        console.error("Error verifying client password:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get client projects by slug (authenticated)
export const getClientProjects = async (req, res) => {
    try {
        const { slug } = req.body;

        if (!slug) {
            return res.status(400).json({ error: "slug is required" });
        }

        // Get client by slug
        const client = await sql`
            SELECT client_id, user_id, name 
            FROM clients 
            WHERE slug = ${slug} AND status = 'active'
        `;

        if (client.length === 0) {
            return res.status(404).json({ error: "Client not found" });
        }

        const clientId = client[0].client_id;
        const userId = client[0].user_id;

        // Get all projects for this client
        const projects = await sql`
            SELECT 
                p.id,
                p.name,
                p.description,
                p.status,
                p.start_date,
                p.end_date,
                p.icon,
                p.created_at,
                p.updated_at
            FROM projects p
            WHERE p.client_id = ${clientId}
            AND p.status IN ('active', 'in_progress', 'completed')
            ORDER BY p.created_at DESC
        `;

        // Get tasks count for each project
        const projectsWithStats = await Promise.all(projects.map(async (project) => {
            const tasks = await sql`
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'done') as completed,
                    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
                    COUNT(*) FILTER (WHERE status = 'todo') as todo
                FROM tasks
                WHERE project_id = ${project.id}
            `;

            const taskStats = tasks[0] || { total: 0, completed: 0, in_progress: 0, todo: 0 };
            const totalTasks = parseInt(taskStats.total) || 0;
            const completedTasks = parseInt(taskStats.completed) || 0;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return {
                ...project,
                tasks: {
                    total: parseInt(taskStats.total) || 0,
                    completed: parseInt(taskStats.completed) || 0,
                    in_progress: parseInt(taskStats.in_progress) || 0,
                    todo: parseInt(taskStats.todo) || 0
                },
                progress,
                lastUpdate: project.updated_at
            };
        }));

        res.json({ 
            client: {
                client_id: client[0].client_id,
                name: client[0].name
            },
            projects: projectsWithStats
        });
    } catch (error) {
        console.error("Error getting client projects:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get valuations for a project (authenticated via slug)
export const getProjectValuations = async (req, res) => {
    try {
        const { slug, project_id } = req.body;

        if (!slug || !project_id) {
            return res.status(400).json({ error: "slug and project_id are required" });
        }

        // Verify that the client has access to this project
        const client = await sql`
            SELECT c.client_id, c.user_id
            FROM clients c
            INNER JOIN projects p ON p.client_id = c.client_id
            WHERE c.slug = ${slug} 
            AND c.status = 'active'
            AND p.id = ${project_id}
        `;

        if (client.length === 0) {
            return res.status(403).json({ error: "Access denied or project not found" });
        }

        const userId = client[0].user_id;

        // Get valuations for this project
        const valuations = await sql`
            SELECT 
                id,
                title,
                description,
                status,
                total_amount,
                currency,
                valid_until,
                created_at,
                updated_at,
                sent_at,
                accepted_at,
                rejected_at
            FROM valuations
            WHERE project_id = ${project_id}
            AND user_id = ${userId}
            AND status IN ('active', 'sent', 'draft')
            ORDER BY created_at DESC
        `;

        res.json({ 
            valuations: valuations || []
        });
    } catch (error) {
        console.error("Error getting project valuations:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get all valuations for a client (authenticated via slug)
export const getClientValuations = async (req, res) => {
    try {
        const { slug } = req.body;

        if (!slug) {
            return res.status(400).json({ error: "slug is required" });
        }

        // Get client by slug
        const client = await sql`
            SELECT client_id, user_id
            FROM clients
            WHERE slug = ${slug} AND status = 'active'
        `;

        if (client.length === 0) {
            return res.status(403).json({ error: "Access denied or client not found" });
        }

        const clientId = client[0].client_id;
        const userId = client[0].user_id;

        // Get all valuations for this client
        const valuations = await sql`
            SELECT 
                id,
                title,
                description,
                status,
                total_amount,
                currency,
                valid_until,
                created_at,
                updated_at,
                sent_at,
                accepted_at,
                rejected_at
            FROM valuations
            WHERE client_id = ${clientId}
            AND user_id = ${userId}
            AND status IN ('active', 'sent', 'draft')
            ORDER BY created_at DESC
        `;

        res.json({ 
            valuations: valuations || []
        });
    } catch (error) {
        console.error("Error getting client valuations:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get links for a project (authenticated via slug)
export const getProjectLinks = async (req, res) => {
    try {
        const { slug, project_id } = req.body;

        if (!slug || !project_id) {
            return res.status(400).json({ error: "slug and project_id are required" });
        }

        // Verify that the client has access to this project
        const client = await sql`
            SELECT c.client_id, c.user_id
            FROM clients c
            INNER JOIN projects p ON p.client_id = c.client_id
            WHERE c.slug = ${slug} 
            AND c.status = 'active'
            AND p.id = ${project_id}
        `;

        if (client.length === 0) {
            return res.status(403).json({ error: "Access denied or project not found" });
        }

        const userId = client[0].user_id;

        // Get links for this project
        const links = await sql`
            SELECT 
                id,
                link_url,
                link_title,
                link_description,
                link_type,
                created_at,
                updated_at
            FROM links
            WHERE project_id = ${project_id}
            AND user_id = ${userId}
            ORDER BY created_at DESC
        `;

        res.json({ 
            links: links || []
        });
    } catch (error) {
        console.error("Error getting project links:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

