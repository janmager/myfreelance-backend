import { sql } from "../config/db.js";

// Get all conversations for a freelancer (list of clients with last message)
export const getConversations = async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: "user_id is required" });
        }

        // Get all clients for this freelancer
        const clients = await sql`
            SELECT client_id, name, slug, avatar
            FROM clients
            WHERE user_id = ${user_id} AND status = 'active'
        `;

        // For each client, get the last message
        const conversationsPromises = clients.map(async (client) => {
            const lastMessage = await sql`
                SELECT message, created_at, sender_id
                FROM messages
                WHERE (sender_id = ${user_id} AND receiver_id = ${client.slug})
                   OR (sender_id = ${client.slug} AND receiver_id = ${user_id})
                ORDER BY created_at DESC
                LIMIT 1
            `;

            if (lastMessage.length > 0) {
                return {
                    client_slug: client.slug,
                    client_name: client.name,
                    client_id: client.client_id,
                    avatar: client.avatar,
                    last_message: lastMessage[0].message,
                    last_message_time: lastMessage[0].created_at,
                    last_sender_id: lastMessage[0].sender_id
                };
            }
            return null;
        });

        const conversationsResults = await Promise.all(conversationsPromises);
        const conversations = conversationsResults
            .filter(c => c !== null)
            .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());

        res.json({ 
            conversations: conversations || []
        });
    } catch (error) {
        console.error("Error getting conversations:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get messages for a specific conversation
export const getConversationMessages = async (req, res) => {
    try {
        const { user_id, client_slug } = req.body;

        if (!user_id || !client_slug) {
            return res.status(400).json({ error: "user_id and client_slug are required" });
        }

        // Verify that the client belongs to this user
        const client = await sql`
            SELECT client_id, name, slug, avatar
            FROM clients
            WHERE slug = ${client_slug} AND user_id = ${user_id}
        `;

        if (client.length === 0) {
            return res.status(403).json({ error: "Access denied or client not found" });
        }

        // Get all messages between freelancer and client
        const messages = await sql`
            SELECT * FROM messages
            WHERE (sender_id = ${user_id} AND receiver_id = ${client_slug})
               OR (sender_id = ${client_slug} AND receiver_id = ${user_id})
            ORDER BY created_at ASC
        `;

        res.json({ 
            messages: messages || [],
            client: client[0]
        });
    } catch (error) {
        console.error("Error getting conversation messages:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Send message from freelancer to client
export const sendFreelancerMessage = async (req, res) => {
    try {
        const { user_id, client_slug, message } = req.body;

        if (!user_id || !client_slug || !message) {
            return res.status(400).json({ error: "user_id, client_slug, and message are required" });
        }

        // Validate message length
        if (message.length > 1000) {
            return res.status(400).json({ error: "Message cannot exceed 1000 characters" });
        }

        // Verify that the client belongs to this user
        const client = await sql`
            SELECT client_id, slug
            FROM clients
            WHERE slug = ${client_slug} AND user_id = ${user_id}
        `;

        if (client.length === 0) {
            return res.status(403).json({ error: "Access denied or client not found" });
        }

        // Insert message (sender = user_id, receiver = client_slug)
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
        console.error("Error sending freelancer message:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get unread messages count
export const getUnreadCount = async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: "user_id is required" });
        }

        // Count messages where receiver is user_id (freelancer) and not yet read
        // For now, we'll count all messages from clients
        const count = await sql`
            SELECT COUNT(DISTINCT 
                CASE 
                    WHEN sender_id != ${user_id} THEN sender_id
                    ELSE NULL
                END
            ) as unread_count
            FROM messages
            WHERE receiver_id = ${user_id}
        `;

        res.json({ 
            unread_count: parseInt(count[0]?.unread_count || 0)
        });
    } catch (error) {
        console.error("Error getting unread count:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

