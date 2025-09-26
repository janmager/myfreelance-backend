import { sql } from "../config/db.js";
import crypto from 'crypto';

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

export const addTask = async (req, res) => {
    try {
        const { user_id, client_id, project_id, type, title, priority, status, tags, content, deadline_at } = req.body;

        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;

        const allowedTypes = ['client', 'private'];
        if (type && !allowedTypes.includes(type)) {
            return res.status(400).json({ error: "Invalid task type" });
        }

        const allowedPriority = ['low','medium','high'];
        if (priority && !allowedPriority.includes(priority)) {
            return res.status(400).json({ error: "Invalid priority" });
        }

        const allowedStatus = ['todo','in_progress','done'];
        if (status && !allowedStatus.includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        if (!title) {
            return res.status(400).json({ error: "title is required" });
        }

        if (client_id) {
            const client = await sql`
                SELECT client_id, user_id FROM clients WHERE client_id = ${client_id}
            `;
            if (client.length === 0) return res.status(404).json({ error: "Client not found" });
            if (user.type !== 'admin' && client[0].user_id !== user_id) {
                return res.status(403).json({ error: "Access denied. Client not owned by user." });
            }
        }

        if (project_id) {
            const project = await sql`SELECT id, user_id, client_id FROM projects WHERE id = ${project_id}`;
            if (project.length === 0) return res.status(404).json({ error: "Project not found" });
            if (user.type !== 'admin' && project[0].user_id !== user_id) return res.status(403).json({ error: "Access denied. Project not owned by user." });
            if (client_id && project[0].client_id && project[0].client_id !== client_id) return res.status(400).json({ error: "Project does not belong to selected client" });
        }

        const id = crypto.randomUUID();
        const inserted = await sql`
            INSERT INTO tasks (
                id, user_id, client_id, project_id, type, title, priority, status, tags, content, deadline_at, created_at, updated_at
            ) VALUES (
                ${id}, ${user_id}, ${client_id || null}, ${project_id || null}, ${type || 'client'}, ${title}, ${priority || 'medium'}, ${status || 'todo'}, ${Array.isArray(tags) ? tags : []}, ${content || null}, ${deadline_at || null}, NOW(), NOW()
            ) RETURNING *
        `;
        res.status(201).json({ message: "Task created successfully", task: inserted[0] });
    } catch (error) {
        console.error("Error adding task:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const editTask = async (req, res) => {
    try {
        const { user_id, id, client_id, project_id, type, title, priority, status, tags, content, deadline_at } = req.body;

        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;
        if (!id) return res.status(400).json({ error: "id is required" });

        const task = await sql`SELECT * FROM tasks WHERE id = ${id}`;
        if (task.length === 0) return res.status(404).json({ error: "Task not found" });
        if (user.type !== 'admin' && task[0].user_id !== user_id) return res.status(403).json({ error: "Access denied. Task not owned by user." });

        if (type) {
            const allowedTypes = ['client', 'private'];
            if (!allowedTypes.includes(type)) return res.status(400).json({ error: "Invalid task type" });
        }
        if (priority) {
            const allowedPriority = ['low','medium','high'];
            if (!allowedPriority.includes(priority)) return res.status(400).json({ error: "Invalid priority" });
        }
        if (status) {
            const allowedStatus = ['todo','in_progress','done'];
            if (!allowedStatus.includes(status)) return res.status(400).json({ error: "Invalid status" });
        }
        if (client_id) {
            const client = await sql`SELECT client_id, user_id FROM clients WHERE client_id = ${client_id}`;
            if (client.length === 0) return res.status(404).json({ error: "Client not found" });
            if (user.type !== 'admin' && client[0].user_id !== user_id) return res.status(403).json({ error: "Access denied. Client not owned by user." });
        }
        if (project_id) {
            const project = await sql`SELECT id, user_id, client_id FROM projects WHERE id = ${project_id}`;
            if (project.length === 0) return res.status(404).json({ error: "Project not found" });
            if (user.type !== 'admin' && project[0].user_id !== user_id) return res.status(403).json({ error: "Access denied. Project not owned by user." });
            if (client_id && project[0].client_id && project[0].client_id !== client_id) return res.status(400).json({ error: "Project does not belong to selected client" });
        }

        const updates = {};
        if (client_id !== undefined) updates.client_id = client_id;
        if (type !== undefined) updates.type = type;
        if (title !== undefined) updates.title = title;
        if (priority !== undefined) updates.priority = priority;
        if (status !== undefined) updates.status = status;
        if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
        if (content !== undefined) updates.content = content;
        if (deadline_at !== undefined) updates.deadline_at = deadline_at;
        if (project_id !== undefined) updates.project_id = project_id;

        if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No fields to update" });

        const fields = [];
        const values = [];
        Object.entries(updates).forEach(([k, v]) => { fields.push(`${k} = $${values.length + 1}`); values.push(v); });
        fields.push('updated_at = NOW()');
        const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${values.length + 1} RETURNING *`;
        const updated = await sql.query(query, [...values, id]);
        res.json({ message: "Task updated successfully", task: updated[0] });
    } catch (error) {
        console.error("Error editing task:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteTask = async (req, res) => {
    try {
        const { user_id, id } = req.body;
        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;
        if (!id) return res.status(400).json({ error: "id is required" });

        const task = await sql`SELECT id, user_id FROM tasks WHERE id = ${id}`;
        if (task.length === 0) return res.status(404).json({ error: "Task not found" });
        if (user.type !== 'admin' && task[0].user_id !== user_id) return res.status(403).json({ error: "Access denied. Task not owned by user." });

        await sql`DELETE FROM tasks WHERE id = ${id}`;
        res.json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const listTasks = async (req, res) => {
    try {
        const { user_id, client_id, type, status, priority, search, limit, offset } = req.body;
        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;

        const filters = [];
        const params = [];
        let idx = 1;
        // Always restrict to requesting user
        { filters.push(`user_id = $${idx++}`); params.push(user_id); }
        if (client_id) { filters.push(`client_id = $${idx++}`); params.push(client_id); }
        if (type) { const allowed = ['client','private']; if (!allowed.includes(type)) return res.status(400).json({ error: "Invalid type" }); filters.push(`type = $${idx++}`); params.push(type); }
        if (status) { const allowed = ['todo','in_progress','done']; if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" }); filters.push(`status = $${idx++}`); params.push(status); }
        if (priority) { const allowed = ['low','medium','high']; if (!allowed.includes(priority)) return res.status(400).json({ error: "Invalid priority" }); filters.push(`priority = $${idx++}`); params.push(priority); }
        if (search) { filters.push(`(title ILIKE $${idx} OR content ILIKE $${idx})`); params.push(`%${search}%`); idx++; }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const lim = Math.min(Number(limit) || 50, 100);
        const off = Math.max(Number(offset) || 0, 0);
        const query = `SELECT * FROM tasks ${whereClause} ORDER BY updated_at DESC LIMIT ${lim} OFFSET ${off}`;
        const tasks = await sql.query(query, params);
        res.json({ tasks });
    } catch (error) {
        console.error("Error listing tasks:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getUpcomingTasks = async (req, res) => {
    try {
        const { user_id, days_ahead = 3 } = req.body;

        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + parseInt(days_ahead));

        const tasks = await sql`
            SELECT * FROM tasks
            WHERE user_id = ${user_id}
              AND deadline_at IS NOT NULL
              AND deadline_at <= ${endDate.toISOString()}
              AND status != 'done'
            ORDER BY deadline_at ASC
            LIMIT 20
        `;

        res.json({ tasks });
    } catch (error) {
        console.error("Error getting upcoming tasks:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


