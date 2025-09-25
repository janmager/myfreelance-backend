import { sql } from "../config/db.js";
import crypto from 'crypto';

// Helper: validate active user
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

export const addNote = async (req, res) => {
    try {
        const { user_id, client_id, type, title, tags, content } = req.body;

        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;

        // Validate type
        const allowedTypes = ['client', 'idea', 'private'];
        if (type && !allowedTypes.includes(type)) {
            return res.status(400).json({ error: "Invalid note type" });
        }

        // If type is 'client', ensure client_id belongs to user unless admin
        if (client_id) {
            const client = await sql`
                SELECT client_id, user_id FROM clients WHERE client_id = ${client_id}
            `;
            if (client.length === 0) {
                return res.status(404).json({ error: "Client not found" });
            }
            if (user.type !== 'admin' && client[0].user_id !== user_id) {
                return res.status(403).json({ error: "Access denied. Client not owned by user." });
            }
        }

        const id = crypto.randomUUID();
        const newNote = await sql`
            INSERT INTO notes (
                id, user_id, client_id, type, title, tags, content, created_at, updated_at
            ) VALUES (
                ${id}, ${user_id}, ${client_id || null}, ${type || 'client'}, ${title || null}, ${Array.isArray(tags) ? tags : []}, ${content || null}, NOW(), NOW()
            ) RETURNING *
        `;

        res.status(201).json({ message: "Note created successfully", note: newNote[0] });
    } catch (error) {
        console.error("Error adding note:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const editNote = async (req, res) => {
    try {
        const { user_id, id, client_id, type, title, tags, content } = req.body;

        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;

        if (!id) {
            return res.status(400).json({ error: "id is required" });
        }

        const note = await sql`
            SELECT * FROM notes WHERE id = ${id}
        `;
        if (note.length === 0) {
            return res.status(404).json({ error: "Note not found" });
        }

        if (user.type !== 'admin' && note[0].user_id !== user_id) {
            return res.status(403).json({ error: "Access denied. Note not owned by user." });
        }

        if (type) {
            const allowedTypes = ['client', 'idea', 'private'];
            if (!allowedTypes.includes(type)) {
                return res.status(400).json({ error: "Invalid note type" });
            }
        }

        // If client_id provided, validate ownership
        if (client_id) {
            const client = await sql`
                SELECT client_id, user_id FROM clients WHERE client_id = ${client_id}
            `;
            if (client.length === 0) {
                return res.status(404).json({ error: "Client not found" });
            }
            if (user.type !== 'admin' && client[0].user_id !== user_id) {
                return res.status(403).json({ error: "Access denied. Client not owned by user." });
            }
        }

        const updates = {};
        if (client_id !== undefined) updates.client_id = client_id;
        if (type !== undefined) updates.type = type;
        if (title !== undefined) updates.title = title;
        if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
        if (content !== undefined) updates.content = content;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        const fields = [];
        const values = [];
        Object.entries(updates).forEach(([k, v]) => {
            fields.push(`${k} = $${values.length + 1}`);
            values.push(v);
        });
        fields.push('updated_at = NOW()');

        const query = `
            UPDATE notes SET ${fields.join(', ')} WHERE id = $${values.length + 1} RETURNING *
        `;
        const updated = await sql.query(query, [...values, id]);

        res.json({ message: "Note updated successfully", note: updated[0] });
    } catch (error) {
        console.error("Error editing note:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteNote = async (req, res) => {
    try {
        const { user_id, id } = req.body;

        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;

        if (!id) {
            return res.status(400).json({ error: "id is required" });
        }

        const note = await sql`
            SELECT id, user_id FROM notes WHERE id = ${id}
        `;
        if (note.length === 0) {
            return res.status(404).json({ error: "Note not found" });
        }

        if (user.type !== 'admin' && note[0].user_id !== user_id) {
            return res.status(403).json({ error: "Access denied. Note not owned by user." });
        }

        await sql`
            DELETE FROM notes WHERE id = ${id}
        `;

        res.json({ message: "Note deleted successfully" });
    } catch (error) {
        console.error("Error deleting note:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const listNotes = async (req, res) => {
    try {
        const { user_id, client_id, type, search, limit, offset } = req.body;

        const user = await getActiveUserOrError(user_id, res);
        if (!user) return;

        // Base filters
        const filters = [];
        const params = [];
        let idx = 1;

        // Always restrict to requesting user
        filters.push(`user_id = $${idx++}`);
        params.push(user_id);

        if (client_id) {
            filters.push(`client_id = $${idx++}`);
            params.push(client_id);
        }
        if (type) {
            const allowedTypes = ['client', 'idea', 'private'];
            if (!allowedTypes.includes(type)) {
                return res.status(400).json({ error: "Invalid note type" });
            }
            filters.push(`type = $${idx++}`);
            params.push(type);
        }
        if (search) {
            filters.push(`(title ILIKE $${idx} OR content ILIKE $${idx})`);
            params.push(`%${search}%`);
            idx++;
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const lim = Math.min(Number(limit) || 50, 100);
        const off = Math.max(Number(offset) || 0, 0);

        const query = `
            SELECT * FROM notes
            ${whereClause}
            ORDER BY updated_at DESC
            LIMIT ${lim} OFFSET ${off}
        `;
        const notes = await sql.query(query, params);

        res.json({ notes });
    } catch (error) {
        console.error("Error listing notes:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


