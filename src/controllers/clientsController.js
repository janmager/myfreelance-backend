import { sql } from "../config/db.js";
import crypto from 'crypto';

// ===== ADMIN ENDPOINTS =====
// Wymagają admin_user_id w payload i weryfikacji type='admin'

export const getAllClientsAdmin = async (req, res) => {
    try {
        const { admin_user_id } = req.body;

        if (!admin_user_id) {
            return res.status(400).json({ error: "admin_user_id is required" });
        }

        // Sprawdź czy user jest adminem i aktywny
        const adminUser = await sql`
            SELECT type, state FROM users WHERE user_id = ${admin_user_id}
        `;

        if (adminUser.length === 0) {
            return res.status(404).json({ error: "Admin user not found" });
        }

        if (adminUser[0].state !== 'active') {
            return res.status(403).json({ error: "Access denied. User is not active." });
        }

        if (adminUser[0].type !== 'admin') {
            return res.status(403).json({ error: "Access denied. Admin privileges required." });
        }

        // Pobierz wszystkich klientów
        const clients = await sql`
            SELECT 
                c.*,
                u.name as user_name,
                u.email as user_email
            FROM clients c
            LEFT JOIN users u ON c.user_id = u.user_id
            ORDER BY c.created_at DESC
        `;

        res.json({ clients });
    } catch (error) {
        console.error("Error getting all clients (admin):", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const editClientAdmin = async (req, res) => {
    try {
        const { admin_user_id, client_id, ...updateData } = req.body;

        if (!admin_user_id || !client_id) {
            return res.status(400).json({ error: "admin_user_id and client_id are required" });
        }

        // Sprawdź czy user jest adminem i aktywny
        const adminUser = await sql`
            SELECT type, state FROM users WHERE user_id = ${admin_user_id}
        `;

        if (adminUser.length === 0) {
            return res.status(404).json({ error: "Admin user not found" });
        }

        if (adminUser[0].state !== 'active') {
            return res.status(403).json({ error: "Access denied. User is not active." });
        }

        if (adminUser[0].type !== 'admin') {
            return res.status(403).json({ error: "Access denied. Admin privileges required." });
        }

        // Sprawdź czy klient istnieje
        const existingClient = await sql`
            SELECT client_id FROM clients WHERE client_id = ${client_id}
        `;

        if (existingClient.length === 0) {
            return res.status(404).json({ error: "Client not found" });
        }

        // Przygotuj dane do aktualizacji
        const allowedFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'status', 'country', 'nip'];
        const fieldsToUpdate = {};
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                fieldsToUpdate[field] = updateData[field];
            }
        });

        if (Object.keys(fieldsToUpdate).length === 0) {
            return res.status(400).json({ error: "No valid fields to update" });
        }

        // Zbuduj query UPDATE
        const updateFields = [];
        const updateValues = [];
        
        Object.entries(fieldsToUpdate).forEach(([key, value]) => {
            updateFields.push(`${key} = $${updateValues.length + 1}`);
            updateValues.push(value);
        });
        
        updateFields.push('updated_at = NOW()');
        
        const query = `
            UPDATE clients 
            SET ${updateFields.join(', ')}
            WHERE client_id = $${updateValues.length + 1}
            RETURNING *
        `;
        
        const updatedClient = await sql.query(query, [...updateValues, client_id]);

        res.json({ 
            message: "Client updated successfully", 
            client: updatedClient[0] 
        });
    } catch (error) {
        console.error("Error editing client (admin):", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ===== USER ENDPOINTS =====
// Wymagają weryfikacji type='user' lub type='admin'

export const getClientById = async (req, res) => {
    try {
        const { user_id, client_id } = req.body;

        if (!user_id || !client_id) {
            return res.status(400).json({ error: "user_id and client_id are required" });
        }

        // Sprawdź czy user istnieje, jest aktywny i ma odpowiedni typ
        const user = await sql`
            SELECT type, state FROM users WHERE user_id = ${user_id}
        `;

        if (user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user[0].state !== 'active') {
            return res.status(403).json({ error: "Access denied. User is not active." });
        }

        if (!['user', 'admin'].includes(user[0].type)) {
            return res.status(403).json({ error: "Access denied. Invalid user type." });
        }

        // Pobierz klienta (admin może pobrać każdego, user tylko swoich)
        let client;
        if (user[0].type === 'admin') {
            client = await sql`
                SELECT * FROM clients WHERE client_id = ${client_id}
            `;
        } else {
            client = await sql`
                SELECT * FROM clients WHERE client_id = ${client_id} AND user_id = ${user_id}
            `;
        }

        if (client.length === 0) {
            return res.status(404).json({ error: "Client not found or access denied" });
        }

        res.json({ client: client[0] });
    } catch (error) {
        console.error("Error getting client by id:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getClientsByUserId = async (req, res) => {
    try {
        const { user_id, target_user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: "user_id is required" });
        }

        // Sprawdź czy user istnieje, jest aktywny i ma odpowiedni typ
        const user = await sql`
            SELECT type, state FROM users WHERE user_id = ${user_id}
        `;

        if (user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user[0].state !== 'active') {
            return res.status(403).json({ error: "Access denied. User is not active." });
        }

        if (!['user', 'admin'].includes(user[0].type)) {
            return res.status(403).json({ error: "Access denied. Invalid user type." });
        }

        // Określ którego usera klientów pobrać
        const queryUserId = target_user_id || user_id;
        
        // Jeśli pobiera innych userów, musi być adminem
        if (queryUserId !== user_id && user[0].type !== 'admin') {
            return res.status(403).json({ error: "Access denied. Can only view your own clients." });
        }

        // Pobierz klientów wraz z licznikami projektów i umów danego użytkownika
        const clients = await sql`
            SELECT 
                c.*,
                COALESCE(p.cnt, 0) AS projects_count,
                COALESCE(k.cnt, 0) AS contracts_count
            FROM clients c
            LEFT JOIN (
                SELECT client_id, COUNT(*) AS cnt
                FROM projects
                WHERE user_id = ${queryUserId}
                GROUP BY client_id
            ) p ON p.client_id = c.client_id
            LEFT JOIN (
                SELECT client_id, COUNT(*) AS cnt
                FROM contracts
                WHERE user_id = ${queryUserId}
                GROUP BY client_id
            ) k ON k.client_id = c.client_id
            WHERE c.user_id = ${queryUserId}
            ORDER BY c.created_at DESC
        `;

        res.json({ clients });
    } catch (error) {
        console.error("Error getting clients by user id:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const archiveClient = async (req, res) => {
    try {
        const { user_id, client_id } = req.body;

        if (!user_id || !client_id) {
            return res.status(400).json({ error: "user_id and client_id are required" });
        }

        // Sprawdź czy user istnieje, jest aktywny i ma odpowiedni typ
        const user = await sql`
            SELECT type, state FROM users WHERE user_id = ${user_id}
        `;

        if (user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user[0].state !== 'active') {
            return res.status(403).json({ error: "Access denied. User is not active." });
        }

        if (!['user', 'admin'].includes(user[0].type)) {
            return res.status(403).json({ error: "Access denied. Invalid user type." });
        }

        // Sprawdź czy klient istnieje i należy do usera (chyba że admin)
        let client;
        if (user[0].type === 'admin') {
            client = await sql`
                SELECT client_id FROM clients WHERE client_id = ${client_id}
            `;
        } else {
            client = await sql`
                SELECT client_id FROM clients WHERE client_id = ${client_id} AND user_id = ${user_id}
            `;
        }

        if (client.length === 0) {
            return res.status(404).json({ error: "Client not found or access denied" });
        }

        // Zarchiwizuj klienta
        const updatedClient = await sql`
            UPDATE clients 
            SET status = 'archived', updated_at = NOW()
            WHERE client_id = ${client_id}
            RETURNING *
        `;

        res.json({ 
            message: "Client archived successfully", 
            client: updatedClient[0] 
        });
    } catch (error) {
        console.error("Error archiving client:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const addClient = async (req, res) => {
    try {
        const { 
            user_id, 
            name, 
            email, 
            phone, 
            address, 
            city, 
            state, 
            zip, 
            country, 
            nip,
            type
        } = req.body;

        if (!user_id || !name || !email) {
            return res.status(400).json({ error: "user_id, name, and email are required" });
        }

        // Sprawdź czy user istnieje, jest aktywny i ma odpowiedni typ
        const user = await sql`
            SELECT type, state FROM users WHERE user_id = ${user_id}
        `;

        if (user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user[0].state !== 'active') {
            return res.status(403).json({ error: "Access denied. User is not active." });
        }

        if (!['user', 'admin'].includes(user[0].type)) {
            return res.status(403).json({ error: "Access denied. Invalid user type." });
        }

        // Sprawdź czy email już istnieje dla tego usera
        const existingClient = await sql`
            SELECT client_id FROM clients WHERE email = ${email} AND user_id = ${user_id}
        `;

        if (existingClient.length > 0) {
            return res.status(409).json({ error: "Client with this email already exists" });
        }

        // Stwórz nowego klienta
        const clientId = crypto.randomUUID();
        const newClient = await sql`
            INSERT INTO clients (
                client_id, name, email, phone, address, city, state, zip, 
                country, nip, type, user_id, created_at, updated_at
            ) VALUES (
                ${clientId}, ${name}, ${email}, ${phone || null}, ${address || null}, 
                ${city || null}, ${state || null}, ${zip || null}, 
                ${country || null}, ${nip || null}, ${type || 'personal'}, ${user_id}, 
                NOW(), NOW()
            ) RETURNING *
        `;

        res.status(201).json({ 
            message: "Client created successfully", 
            client: newClient[0] 
        });
    } catch (error) {
        console.error("Error adding client:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const editClient = async (req, res) => {
    try {
        const { 
            user_id, 
            client_id, 
            name, 
            email, 
            phone, 
            address, 
            city, 
            state, 
            zip, 
            country, 
            nip,
            type,
            status
        } = req.body;

        if (!user_id || !client_id) {
            return res.status(400).json({ error: "user_id and client_id are required" });
        }

        // Sprawdź czy user istnieje, jest aktywny i ma odpowiedni typ
        const user = await sql`
            SELECT type, state FROM users WHERE user_id = ${user_id}
        `;

        if (user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user[0].state !== 'active') {
            return res.status(403).json({ error: "Access denied. User is not active." });
        }

        if (!['user', 'admin'].includes(user[0].type)) {
            return res.status(403).json({ error: "Access denied. Invalid user type." });
        }

        // Sprawdź czy klient istnieje i należy do usera (chyba że admin)
        let existingClient;
        if (user[0].type === 'admin') {
            existingClient = await sql`
                SELECT client_id FROM clients WHERE client_id = ${client_id}
            `;
        } else {
            existingClient = await sql`
                SELECT client_id FROM clients WHERE client_id = ${client_id} AND user_id = ${user_id}
            `;
        }

        if (existingClient.length === 0) {
            return res.status(404).json({ error: "Client not found or access denied" });
        }

        // Sprawdź czy email już istnieje dla innego klienta tego usera
        if (email) {
            const emailCheck = await sql`
                SELECT client_id FROM clients 
                WHERE email = ${email} AND user_id = ${user_id} AND client_id != ${client_id}
            `;

            if (emailCheck.length > 0) {
                return res.status(409).json({ error: "Client with this email already exists" });
            }
        }

        // Przygotuj dane do aktualizacji
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (city !== undefined) updateData.city = city;
        if (state !== undefined) updateData.state = state;
        if (zip !== undefined) updateData.zip = zip;
        if (country !== undefined) updateData.country = country;
        if (nip !== undefined) updateData.nip = nip;
        if (type !== undefined) updateData.type = type;
        if (status !== undefined) updateData.status = status;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        // Zbuduj query UPDATE
        const updateFields = [];
        const updateValues = [];
        
        Object.entries(updateData).forEach(([key, value]) => {
            updateFields.push(`${key} = $${updateValues.length + 1}`);
            updateValues.push(value);
        });
        
        updateFields.push('updated_at = NOW()');
        
        const query = `
            UPDATE clients 
            SET ${updateFields.join(', ')}
            WHERE client_id = $${updateValues.length + 1}
            RETURNING *
        `;
        
        const updatedClient = await sql.query(query, [...updateValues, client_id]);

        res.json({ 
            message: "Client updated successfully", 
            client: updatedClient[0] 
        });
    } catch (error) {
        console.error("Error editing client:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteClient = async (req, res) => {
    try {
        const { user_id, client_id } = req.body;

        if (!user_id || !client_id) {
            return res.status(400).json({ error: "user_id and client_id are required" });
        }

        // Sprawdź czy user istnieje, jest aktywny i ma odpowiedni typ
        const user = await sql`
            SELECT type, state FROM users WHERE user_id = ${user_id}
        `;

        if (user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user[0].state !== 'active') {
            return res.status(403).json({ error: "Access denied. User is not active." });
        }

        if (!['user', 'admin'].includes(user[0].type)) {
            return res.status(403).json({ error: "Access denied. Invalid user type." });
        }

        // Sprawdź czy klient istnieje i należy do usera (chyba że admin)
        let existingClient;
        if (user[0].type === 'admin') {
            existingClient = await sql`
                SELECT client_id FROM clients WHERE client_id = ${client_id}
            `;
        } else {
            existingClient = await sql`
                SELECT client_id FROM clients WHERE client_id = ${client_id} AND user_id = ${user_id}
            `;
        }

        if (existingClient.length === 0) {
            return res.status(404).json({ error: "Client not found or access denied" });
        }

        // Sprawdź czy klient ma powiązane projekty lub umowy
        const relatedProjects = await sql`
            SELECT COUNT(*) as count FROM projects WHERE client_id = ${client_id}
        `;

        const relatedContracts = await sql`
            SELECT COUNT(*) as count FROM contracts WHERE client_id = ${client_id}
        `;

        if (relatedProjects[0].count > 0 || relatedContracts[0].count > 0) {
            return res.status(409).json({ 
                error: "Cannot delete client with associated projects or contracts. Please remove or reassign them first." 
            });
        }

        // Usuń klienta
        await sql`
            DELETE FROM clients WHERE client_id = ${client_id}
        `;

        res.json({ 
            message: "Client deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting client:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};