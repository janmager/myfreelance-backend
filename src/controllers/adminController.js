import { sql } from '../config/db.js';

// Pobierz wszystkich użytkowników z paginacją
export const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', sort_by = 'register_at', sort_order = 'desc' } = req.body;
        
        const offset = (page - 1) * limit;
        
        // Przygotuj zapytanie z filtrowaniem i sortowaniem
        let whereClause = '';
        let params = [];
        let paramIndex = 1;

        if (search) {
            whereClause = `WHERE (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Sprawdź czy sort_by jest dozwolone (zabezpieczenie przed SQL injection)
        const allowedSortFields = ['register_at', 'updated_at', 'name', 'email', 'type', 'state'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'register_at';
        const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        // Pobierz użytkowników z paginacją
        const usersQuery = `
            SELECT 
                user_id,
                email,
                name,
                phone,
                type,
                state,
                register_at,
                updated_at,
                logged_at,
                avatar,
                premium_level
            FROM users 
            ${whereClause}
            ORDER BY ${sortField} ${sortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        params.push(limit, offset);
        
        const users = await sql.query(usersQuery, params);

        // Pobierz całkowitą liczbę użytkowników
        const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
        const countParams = search ? [`%${search}%`] : [];
        const countResult = await sql.query(countQuery, countParams);
        const total = parseInt(countResult[0]?.total || 0);

        // Oblicz statystyki
        const statsQuery = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE state = 'active') as active_users,
                COUNT(*) FILTER (WHERE state = 'to-confirm') as pending_users,
                COUNT(*) FILTER (WHERE type = 'admin') as admin_users,
                COUNT(*) FILTER (WHERE premium_level > 0) as premium_users
            FROM users
        `;
        const stats = await sql.query(statsQuery);

        res.status(200).json({
            response: true,
            users: users,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_users: total,
                limit: limit,
                has_next: page < Math.ceil(total / limit),
                has_prev: page > 1
            },
            stats: stats[0] || {}
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            response: false,
            message: 'Błąd podczas pobierania użytkowników'
        });
    }
};

// Pobierz szczegóły użytkownika
export const getUserById = async (req, res) => {
    try {
        const { user_id: targetUserId } = req.params;

        const user = await sql`
            SELECT 
                user_id,
                email,
                name,
                phone,
                type,
                state,
                register_at,
                updated_at,
                logged_at,
                avatar,
                premium_level,
                language,
                push_notifications
            FROM users 
            WHERE user_id = ${targetUserId}
        `;

        if (user.length === 0) {
            return res.status(404).json({
                response: false,
                message: 'Użytkownik nie został znaleziony'
            });
        }

        // Pobierz dodatkowe statystyki użytkownika
        const [clientsCount, projectsCount, tasksCount, filesCount] = await Promise.all([
            sql`SELECT COUNT(*) as count FROM clients WHERE user_id = ${targetUserId}`,
            sql`SELECT COUNT(*) as count FROM projects WHERE user_id = ${targetUserId}`,
            sql`SELECT COUNT(*) as count FROM tasks WHERE user_id = ${targetUserId}`,
            sql`SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size FROM files WHERE user_id = ${targetUserId}`
        ]);

        res.status(200).json({
            response: true,
            user: user[0],
            stats: {
                clients: parseInt(clientsCount[0]?.count || 0),
                projects: parseInt(projectsCount[0]?.count || 0),
                tasks: parseInt(tasksCount[0]?.count || 0),
                files: parseInt(filesCount[0]?.count || 0),
                storage_used: parseInt(filesCount[0]?.total_size || 0)
            }
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({
            response: false,
            message: 'Błąd podczas pobierania szczegółów użytkownika'
        });
    }
};

// Aktualizuj użytkownika
export const updateUser = async (req, res) => {
    try {
        const { user_id: targetUserId } = req.params;
        const { 
            name, 
            email, 
            phone, 
            type, 
            state, 
            premium_level,
            language,
            push_notifications 
        } = req.body;

        // Sprawdź czy użytkownik istnieje
        const existingUser = await sql`
            SELECT user_id FROM users WHERE user_id = ${targetUserId}
        `;

        if (existingUser.length === 0) {
            return res.status(404).json({
                response: false,
                message: 'Użytkownik nie został znaleziony'
            });
        }

        // Sprawdź czy email nie jest już używany przez innego użytkownika
        if (email) {
            const emailCheck = await sql`
                SELECT user_id FROM users WHERE email = ${email} AND user_id != ${targetUserId}
            `;
            if (emailCheck.length > 0) {
                return res.status(400).json({
                    response: false,
                    message: 'Email jest już używany przez innego użytkownika'
                });
            }
        }

        // Przygotuj dane do aktualizacji
        const updateData = {
            updated_at: new Date().toISOString()
        };

        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (type !== undefined) updateData.type = type;
        if (state !== undefined) updateData.state = state;
        if (premium_level !== undefined) updateData.premium_level = premium_level;
        if (language !== undefined) updateData.language = language;
        if (push_notifications !== undefined) updateData.push_notifications = push_notifications;

        // Aktualizuj użytkownika
        const updatedUser = await sql`
            UPDATE users 
            SET 
                name = ${updateData.name || null},
                email = ${updateData.email || null},
                phone = ${updateData.phone || null},
                type = ${updateData.type || null},
                state = ${updateData.state || null},
                premium_level = ${updateData.premium_level || null},
                language = ${updateData.language || null},
                push_notifications = ${updateData.push_notifications || null},
                updated_at = ${updateData.updated_at}
            WHERE user_id = ${targetUserId}
            RETURNING 
                user_id,
                email,
                name,
                phone,
                type,
                state,
                register_at,
                updated_at,
                avatar,
                premium_level,
                language,
                push_notifications
        `;

        res.status(200).json({
            response: true,
            message: 'Użytkownik został zaktualizowany',
            user: updatedUser[0]
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            response: false,
            message: 'Błąd podczas aktualizacji użytkownika'
        });
    }
};

// Usuń użytkownika
export const deleteUser = async (req, res) => {
    try {
        const { user_id: targetUserId } = req.params;

        // Sprawdź czy użytkownik istnieje
        const existingUser = await sql`
            SELECT user_id, type FROM users WHERE user_id = ${targetUserId}
        `;

        if (existingUser.length === 0) {
            return res.status(404).json({
                response: false,
                message: 'Użytkownik nie został znaleziony'
            });
        }

        // Nie pozwól na usunięcie ostatniego admina
        if (existingUser[0].type === 'admin') {
            const adminCount = await sql`SELECT COUNT(*) as count FROM users WHERE type = 'admin'`;
            if (parseInt(adminCount[0]?.count || 0) <= 1) {
                return res.status(400).json({
                    response: false,
                    message: 'Nie można usunąć ostatniego administratora'
                });
            }
        }

        // Usuń użytkownika (kaskadowo usunie wszystkie powiązane dane)
        await sql`DELETE FROM users WHERE user_id = ${targetUserId}`;

        res.status(200).json({
            response: true,
            message: 'Użytkownik został usunięty'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            response: false,
            message: 'Błąd podczas usuwania użytkownika'
        });
    }
};

// Pobierz statystyki systemu
export const getSystemStats = async (req, res) => {
    try {
        const [usersStats, contentStats, storageStats] = await Promise.all([
            // Statystyki użytkowników
            sql`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(*) FILTER (WHERE state = 'active') as active_users,
                    COUNT(*) FILTER (WHERE state = 'to-confirm') as pending_users,
                    COUNT(*) FILTER (WHERE state = 'blocked') as blocked_users,
                    COUNT(*) FILTER (WHERE type = 'admin') as admin_users,
                    COUNT(*) FILTER (WHERE premium_level > 0) as premium_users,
                    COUNT(*) FILTER (WHERE premium_level = 1) as premium_basic,
                    COUNT(*) FILTER (WHERE premium_level = 2) as premium_plus
                FROM users
            `,
            // Statystyki treści
            sql`
                SELECT 
                    (SELECT COUNT(*) FROM clients) as total_clients,
                    (SELECT COUNT(*) FROM projects) as total_projects,
                    (SELECT COUNT(*) FROM tasks) as total_tasks,
                    (SELECT COUNT(*) FROM notes) as total_notes,
                    (SELECT COUNT(*) FROM contracts) as total_contracts,
                    (SELECT COUNT(*) FROM links) as total_links
                FROM users LIMIT 1
            `,
            // Statystyki przechowywania
            sql`
                SELECT 
                    COUNT(*) as total_files,
                    COALESCE(SUM(file_size), 0) as total_storage_bytes,
                    COALESCE(AVG(file_size), 0) as avg_file_size
                FROM files
            `
        ]);

        res.status(200).json({
            response: true,
            stats: {
                users: usersStats[0] || {},
                content: contentStats[0] || {},
                storage: storageStats[0] || {}
            }
        });
    } catch (error) {
        console.error('Error fetching system stats:', error);
        res.status(500).json({
            response: false,
            message: 'Błąd podczas pobierania statystyk systemu'
        });
    }
};
