import { sql } from "../config/db.js";

// Send message from client to freelancer
export const sendMessage = async (req, res) => {
    try {
        const { slug, message } = req.body;

        if (!slug || !message) {
            return res.status(400).json({ error: "slug and message are required" });
        }

        // Validate message length
        if (message.length > 1000) {
            return res.status(400).json({ error: "Message cannot exceed 1000 characters" });
        }

        // Get client and user info by slug
        const client = await sql`
            SELECT c.client_id, c.slug, c.user_id
            FROM clients c
            WHERE c.slug = ${slug} AND c.status = 'active'
        `;

        if (client.length === 0) {
            return res.status(404).json({ error: "Client not found" });
        }

        const clientSlug = client[0].slug;
        const receiverId = client[0].user_id; // Freelancer's user_id

        // Insert message
        const newMessage = await sql`
            INSERT INTO messages (sender_id, receiver_id, message, created_at, updated_at)
            VALUES (${clientSlug}, ${receiverId}, ${message}, NOW(), NOW())
            RETURNING *
        `;

        res.status(201).json({ 
            message: newMessage[0],
            success: true 
        });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get messages for a client conversation
export const getMessages = async (req, res) => {
    try {
        const { slug } = req.body;

        if (!slug) {
            return res.status(400).json({ error: "slug is required" });
        }

        // Get client info by slug
        const client = await sql`
            SELECT c.client_id, c.slug, c.user_id
            FROM clients c
            WHERE c.slug = ${slug} AND c.status = 'active'
        `;

        if (client.length === 0) {
            return res.status(404).json({ error: "Client not found" });
        }

        const clientSlug = client[0].slug;
        const freelancerId = client[0].user_id;

        // Get all messages between client and freelancer
        const messages = await sql`
            SELECT * FROM messages
            WHERE (sender_id = ${clientSlug} AND receiver_id = ${freelancerId})
               OR (sender_id = ${freelancerId} AND receiver_id = ${clientSlug})
            ORDER BY created_at ASC
        `;

        res.json({ 
            messages: messages || []
        });
    } catch (error) {
        console.error("Error getting messages:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Send message from freelancer to client (for future use)
export const sendMessageFromFreelancer = async (req, res) => {
    try {
        const { user_id, client_slug, message } = req.body;

        if (!user_id || !client_slug || !message) {
            return res.status(400).json({ error: "user_id, client_slug, and message are required" });
        }

        // Validate message length
        if (message.length > 1000) {
            return res.status(400).json({ error: "Message cannot exceed 1000 characters" });
        }

        // Verify that the user owns this client
        const client = await sql`
            SELECT c.client_id, c.slug
            FROM clients c
            WHERE c.slug = ${client_slug} AND c.user_id = ${user_id} AND c.status = 'active'
        `;

        if (client.length === 0) {
            return res.status(403).json({ error: "Access denied or client not found" });
        }

        // Insert message
        const newMessage = await sql`
            INSERT INTO messages (sender_id, receiver_id, message, created_at, updated_at)
            VALUES (${user_id}, ${client_slug}, ${message}, NOW(), NOW())
            RETURNING *
        `;

        res.status(201).json({ 
            message: newMessage[0],
            success: true 
        });
    } catch (error) {
        console.error("Error sending message from freelancer:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

