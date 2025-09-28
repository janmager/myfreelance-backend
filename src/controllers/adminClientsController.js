import { sql } from '../config/db.js';

// Helper function to check if user is admin
async function getActiveAdminOrError(user_id, res) {
    try {
        const adminUser = await sql`
            SELECT user_id, type, state 
            FROM users 
            WHERE user_id = ${user_id} AND type = 'admin' AND state = 'active'
        `;
        
        if (adminUser.length === 0) {
            res.status(403).json({ 
                response: false, 
                message: 'Brak uprawnień administratora.' 
            });
            return null;
        }
        
        return adminUser[0];
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).json({ 
            response: false, 
            message: 'Błąd podczas weryfikacji uprawnień.' 
        });
        return null;
    }
}

// Get all clients with pagination
export const getClients = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', sort_by = 'created_at', sort_order = 'desc' } = req.body;
        const { user_id } = req.body;
        
        const adminUser = await getActiveAdminOrError(user_id, res);
        if (!adminUser) return;
        
        const offset = (page - 1) * limit;
        
        // Prepare query with filtering and sorting
        let whereClause = '';
        let params = [];
        let paramIndex = 1;

        if (search) {
            whereClause = `WHERE (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Check if sort_by is allowed (SQL injection protection)
        const allowedSortFields = ['created_at', 'updated_at', 'name', 'email', 'status'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
        const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        // Get clients with pagination
        const clientsQuery = `
            SELECT 
                client_id,
                name,
                email,
                phone,
                status,
                created_at,
                updated_at,
                avatar
            FROM clients 
            ${whereClause}
            ORDER BY ${sortField} ${sortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        params.push(limit, offset);
        
        const clients = await sql.unsafe(clientsQuery, params);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM clients 
            ${whereClause}
        `;
        
        const countParams = search ? [`%${search}%`] : [];
        const totalResult = await sql.unsafe(countQuery, countParams);
        const total = parseInt(totalResult[0].total);

        // Get statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total_clients,
                COUNT(*) FILTER (WHERE status = 'active') as active_clients,
                COUNT(*) FILTER (WHERE status = 'archived') as archived_clients
            FROM clients
        `;
        
        const stats = await sql.unsafe(statsQuery);

        res.status(200).json({
            response: true,
            clients,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: limit
            },
            stats: stats[0]
        });

    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ 
            response: false, 
            message: 'Błąd podczas pobierania klientów.' 
        });
    }
};

// Update client
export const updateClient = async (req, res) => {
    try {
        const { user_id, client_id, ...updateData } = req.body;
        
        const adminUser = await getActiveAdminOrError(user_id, res);
        if (!adminUser) return;

        // Validate required fields
        if (!client_id) {
            return res.status(400).json({ 
                response: false, 
                message: 'Brak ID klienta.' 
            });
        }

        // Check if client exists
        const existingClient = await sql`
            SELECT client_id FROM clients WHERE client_id = ${client_id}
        `;
        
        if (existingClient.length === 0) {
            return res.status(404).json({ 
                response: false, 
                message: 'Klient nie został znaleziony.' 
            });
        }

        // Update client
        const updatedClient = await sql`
            UPDATE clients 
            SET 
                name = ${updateData.name || null},
                email = ${updateData.email || null},
                phone = ${updateData.phone || null},
                status = ${updateData.status || null},
                updated_at = NOW()
            WHERE client_id = ${client_id}
            RETURNING 
                client_id,
                name,
                email,
                phone,
                status,
                created_at,
                updated_at,
                avatar
        `;

        res.status(200).json({
            response: true,
            message: 'Klient został zaktualizowany pomyślnie.',
            client: updatedClient[0]
        });

    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ 
            response: false, 
            message: 'Błąd podczas aktualizacji klienta.' 
        });
    }
};

// Get client details
export const getClient = async (req, res) => {
    try {
        const { user_id, client_id } = req.body;
        
        const adminUser = await getActiveAdminOrError(user_id, res);
        if (!adminUser) return;

        if (!client_id) {
            return res.status(400).json({ 
                response: false, 
                message: 'Brak ID klienta.' 
            });
        }

        const client = await sql`
            SELECT 
                client_id,
                name,
                email,
                phone,
                status,
                created_at,
                updated_at,
                avatar
            FROM clients 
            WHERE client_id = ${client_id}
        `;

        if (client.length === 0) {
            return res.status(404).json({ 
                response: false, 
                message: 'Klient nie został znaleziony.' 
            });
        }

        res.status(200).json({
            response: true,
            client: client[0]
        });

    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ 
            response: false, 
            message: 'Błąd podczas pobierania klienta.' 
        });
    }
};
