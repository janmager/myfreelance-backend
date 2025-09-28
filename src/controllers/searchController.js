import { sql } from "../config/db.js";

async function getActiveUserOrError(user_id, res) {
    if (!user_id) {
        res.status(400).json({ error: "user_id is required" });
        return null;
    }
    const user = await sql`
        SELECT user_id, state, type FROM users WHERE user_id = ${user_id}
    `;
    if (user.length === 0) {
        res.status(404).json({ error: "User not found" });
        return null;
    }
    if (user[0].state !== 'active') {
        res.status(403).json({ error: "Access denied. User is not active." });
        return null;
    }
    return user[0];
}

export const globalSearch = async (req, res) => {
    try {
        const { user_id, q, limit } = req.body;
        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;

        const query = (q || '').trim();
        if (!query || query.length < 3) {
            return res.status(400).json({ error: "Query must be at least 3 characters" });
        }

        const perTable = Math.min(Number(limit) || 5, 20);
        const like = `%${query}%`;

        // Clients
        const clients = await sql`
            SELECT client_id, name, email, phone, city, country, status, updated_at
            FROM clients
            WHERE user_id = ${user_id}
              AND (
                name ILIKE ${like}
                OR email ILIKE ${like}
                OR phone ILIKE ${like}
                OR city ILIKE ${like}
                OR country ILIKE ${like}
              )
            ORDER BY updated_at DESC
            LIMIT ${perTable}
        `;

        // Projects
        const projects = await sql`
            SELECT id, name, description, status, type, client_id, updated_at
            FROM projects
            WHERE user_id = ${user_id}
              AND (
                name ILIKE ${like}
                OR description ILIKE ${like}
              )
            ORDER BY updated_at DESC
            LIMIT ${perTable}
        `;

        // Tasks
        const tasks = await sql`
            SELECT id, title, content, status, priority, client_id, project_id, deadline_at, updated_at
            FROM tasks
            WHERE user_id = ${user_id}
              AND (
                title ILIKE ${like}
                OR content ILIKE ${like}
              )
            ORDER BY updated_at DESC
            LIMIT ${perTable}
        `;

        // Notes
        const notes = await sql`
            SELECT id, title, content, type, client_id, project_id, tags, updated_at
            FROM notes
            WHERE user_id = ${user_id}
              AND (
                title ILIKE ${like}
                OR content ILIKE ${like}
                OR tags::text ILIKE ${like}
              )
            ORDER BY updated_at DESC
            LIMIT ${perTable}
        `;

        // Contracts
        const contracts = await sql`
            SELECT id, name, type, description, status, client_id, project_id, signed_at, updated_at
            FROM contracts
            WHERE user_id = ${user_id}
              AND (
                name ILIKE ${like}
                OR type ILIKE ${like}
                OR description ILIKE ${like}
              )
            ORDER BY updated_at DESC
            LIMIT ${perTable}
        `;

        // Files
        const files = await sql`
            SELECT id, file_name, file_type, file_size, client_id, project_id, file_created_at
            FROM files
            WHERE user_id = ${user_id}
              AND file_name ILIKE ${like}
            ORDER BY file_created_at DESC
            LIMIT ${perTable}
        `;

        // Links
        const links = await sql`
            SELECT id, link_url, link_title, link_description, link_type, client_id, project_id, created_at, updated_at
            FROM links
            WHERE user_id = ${user_id}
              AND (
                link_url ILIKE ${like}
                OR link_title ILIKE ${like}
                OR link_description ILIKE ${like}
              )
            ORDER BY updated_at DESC
            LIMIT ${perTable}
        `;

        // Valuations
        const valuations = await sql`
            SELECT id, title, description, status, total_amount, total_amount_net, total_amount_gross, currency, settlement_type, contract_type, client_id, project_id, created_at, updated_at
            FROM valuations
            WHERE user_id = ${user_id}
              AND (
                title ILIKE ${like}
                OR description ILIKE ${like}
              )
            ORDER BY updated_at DESC
            LIMIT ${perTable}
        `;

        res.json({
            query,
            results: {
                clients,
                projects,
                tasks,
                notes,
                contracts,
                files,
                links,
                valuations,
            }
        });
    } catch (error) {
        console.error("Error in globalSearch:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


