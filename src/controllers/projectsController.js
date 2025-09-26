import { sql } from "../config/db.js";
import crypto from 'crypto';

async function getActiveUserOrError(user_id, res) {
    if (!user_id) {
        res.status(400).json({ error: "user_id is required" });
        return null;
    }
    const user = await sql`SELECT user_id, state, type FROM users WHERE user_id = ${user_id}`;
    if (user.length === 0) { res.status(404).json({ error: "User not found" }); return null; }
    if (user[0].state !== 'active') { res.status(403).json({ error: "Access denied. User is not active." }); return null; }
    return user[0];
}

export const addProject = async (req, res) => {
    try {
        const { user_id, client_id, name, type, description, status, start_date, end_date, warranty_until } = req.body;

        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;

        if (!name) return res.status(400).json({ error: "name is required" });
        if (type && !['client','private'].includes(type)) return res.status(400).json({ error: "Invalid type" });
        const allowedStatuses = ['draft','in_progress','active','completed','cancelled','inactive','archived'];
        if (status && !allowedStatuses.includes(status)) return res.status(400).json({ error: "Invalid status" });

        if ((type || 'private') === 'client') {
            if (!client_id) return res.status(400).json({ error: "client_id is required when type=client" });
            const client = await sql`SELECT client_id, user_id FROM clients WHERE client_id = ${client_id}`;
            if (client.length === 0) return res.status(404).json({ error: "Client not found" });
            if (user.type !== 'admin' && client[0].user_id !== user_id) return res.status(403).json({ error: "Access denied. Client not owned by user." });
        }

        const id = crypto.randomUUID();
        const inserted = await sql`
            INSERT INTO projects (
                id, user_id, client_id, name, type, description, status, start_date, end_date, warranty_until, created_at, updated_at
            ) VALUES (
                ${id}, ${user_id}, ${client_id || null}, ${name}, ${type || 'private'}, ${description || null}, ${status || 'active'}, ${start_date || null}, ${end_date || null}, ${warranty_until || null}, NOW(), NOW()
            ) RETURNING *
        `;
        res.status(201).json({ message: "Project created successfully", project: inserted[0] });
    } catch (error) {
        console.error("Error adding project:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const editProject = async (req, res) => {
    try {
        const { user_id, id, client_id, name, type, description, status, start_date, end_date, icon, warranty_until } = req.body;
        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;
        if (!id) return res.status(400).json({ error: "id is required" });

        const project = await sql`SELECT * FROM projects WHERE id = ${id}`;
        if (project.length === 0) return res.status(404).json({ error: "Project not found" });
        if (user.type !== 'admin' && project[0].user_id !== user_id) return res.status(403).json({ error: "Access denied. Project not owned by user." });

        if (type && !['client','private'].includes(type)) return res.status(400).json({ error: "Invalid type" });
        const allowedStatusesEdit = ['draft','in_progress','active','completed','cancelled','inactive','archived'];
        if (status && !allowedStatusesEdit.includes(status)) return res.status(400).json({ error: "Invalid status" });
        if (client_id) {
            const client = await sql`SELECT client_id, user_id FROM clients WHERE client_id = ${client_id}`;
            if (client.length === 0) return res.status(404).json({ error: "Client not found" });
            if (user.type !== 'admin' && client[0].user_id !== user_id) return res.status(403).json({ error: "Access denied. Client not owned by user." });
        }

        const updates = {};
        if (client_id !== undefined) updates.client_id = client_id;
        if (name !== undefined) updates.name = name;
        if (type !== undefined) updates.type = type;
        if (description !== undefined) updates.description = description;
        if (status !== undefined) updates.status = status;
        if (start_date !== undefined) updates.start_date = start_date;
        if (end_date !== undefined) updates.end_date = end_date;
        if (icon !== undefined) updates.icon = icon;
        if (warranty_until !== undefined) updates.warranty_until = warranty_until;
        if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No fields to update" });

        const fields = [];
        const values = [];
        Object.entries(updates).forEach(([k, v]) => { fields.push(`${k} = $${values.length + 1}`); values.push(v); });
        fields.push('updated_at = NOW()');
        const query = `UPDATE projects SET ${fields.join(', ')} WHERE id = $${values.length + 1} RETURNING *`;
        const updated = await sql.query(query, [...values, id]);
        res.json({ message: "Project updated successfully", project: updated[0] });
    } catch (error) {
        console.error("Error editing project:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const listProjects = async (req, res) => {
    try {
        const { user_id, client_id, type, status, search, limit, offset } = req.body;
        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;

        const filters = [];
        const params = [];
        let idx = 1;
        { filters.push(`user_id = $${idx++}`); params.push(user_id); }
        if (client_id) { filters.push(`client_id = $${idx++}`); params.push(client_id); }
        if (type) { const allowed = ['client','private']; if (!allowed.includes(type)) return res.status(400).json({ error: "Invalid type" }); filters.push(`type = $${idx++}`); params.push(type); }
        if (status) { const allowed = ['draft','in_progress','active','completed','cancelled','inactive','archived']; if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" }); filters.push(`status = $${idx++}`); params.push(status); }
        if (search) { filters.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); params.push(`%${search}%`); idx++; }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const lim = Math.min(Number(limit) || 50, 100);
        const off = Math.max(Number(offset) || 0, 0);
        const query = `SELECT * FROM projects ${whereClause} ORDER BY updated_at DESC LIMIT ${lim} OFFSET ${off}`;
        const projects = await sql.query(query, params);
        res.json({ projects });
    } catch (error) {
        console.error("Error listing projects:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getProject = async (req, res) => {
    try {
        const { user_id, id } = req.body;
        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;
        if (!id) return res.status(400).json({ error: "id is required" });
        const project = await sql`SELECT * FROM projects WHERE id = ${id}`;
        if (project.length === 0) return res.status(404).json({ error: "Project not found" });
        if (user.type !== 'admin' && project[0].user_id !== user_id) return res.status(403).json({ error: "Access denied. Project not owned by user." });
        res.json({ project: project[0] });
    } catch (error) {
        console.error("Error getting project:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const { user_id, id } = req.body;
        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;
        if (!id) return res.status(400).json({ error: "id is required" });
        
        const project = await sql`SELECT id, user_id FROM projects WHERE id = ${id}`;
        if (project.length === 0) return res.status(404).json({ error: "Project not found" });
        if (user.type !== 'admin' && project[0].user_id !== user_id) return res.status(403).json({ error: "Access denied. Project not owned by user." });
        
        // Sprawdź czy projekt ma powiązane zadania lub umowy
        const relatedTasks = await sql`
            SELECT COUNT(*) as count FROM tasks WHERE project_id = ${id}
        `;

        const relatedContracts = await sql`
            SELECT COUNT(*) as count FROM contracts WHERE project_id = ${id}
        `;

        if (relatedTasks[0].count > 0 || relatedContracts[0].count > 0) {
            return res.status(409).json({ 
                error: "Cannot delete project with associated tasks or contracts. Please remove or reassign them first." 
            });
        }
        
        await sql`DELETE FROM projects WHERE id = ${id}`;
        res.json({ message: "Project deleted successfully" });
    } catch (error) {
        console.error("Error deleting project:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


