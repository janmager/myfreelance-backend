import { sql } from '../config/db.js';

async function getActiveAdminOrError(user_id, res) {
    try {
        const user = await sql`
            SELECT user_id, name, email, type, state, premium_level
            FROM users
            WHERE user_id = ${user_id} AND state = 'active'
        `;

        if (user.length === 0) {
            res.status(401).json({
                response: false,
                message: 'Brak autoryzacji lub konto nieaktywne.'
            });
            return null;
        }

        if (user[0].type !== 'admin') {
            res.status(403).json({
                response: false,
                message: 'Brak uprawnień administratora.'
            });
            return null;
        }

        return user[0];
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).json({
            response: false,
            message: 'Wystąpił błąd podczas weryfikacji uprawnień.'
        });
        return null;
    }
}

export const getProjects = async (req, res) => {
    const { user_id, page = 1, limit = 10, search = '', sort_by = 'created_at', sort_order = 'desc' } = req.body;
    const adminUser = await getActiveAdminOrError(user_id, res);
    if (!adminUser) return;

    try {
        const offset = (page - 1) * limit;

        const allowedSortFields = ['created_at', 'updated_at', 'name', 'status', 'type', 'user_name', 'client_name'];
        const sortField = allowedSortFields.includes(sort_by) ? `p.${sort_by}` : `p.created_at`;
        const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        // Build the query dynamically based on search parameters
        let projects;
        if (search) {
            projects = await sql`
                SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.type,
                    p.status,
                    p.start_date,
                    p.end_date,
                    p.warranty_until,
                    p.icon,
                    p.created_at,
                    p.updated_at,
                    p.user_id,
                    p.client_id,
                    u.name AS user_name,
                    u.email AS user_email,
                    c.name AS client_name
                FROM projects p
                JOIN users u ON p.user_id = u.user_id
                LEFT JOIN clients c ON p.client_id = c.client_id
                WHERE (p.name ILIKE ${`%${search}%`} OR p.description ILIKE ${`%${search}%`} OR u.name ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`} OR c.name ILIKE ${`%${search}%`})
                ORDER BY p.created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `;
        } else {
            projects = await sql`
                SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.type,
                    p.status,
                    p.start_date,
                    p.end_date,
                    p.warranty_until,
                    p.icon,
                    p.created_at,
                    p.updated_at,
                    p.user_id,
                    p.client_id,
                    u.name AS user_name,
                    u.email AS user_email,
                    c.name AS client_name
                FROM projects p
                JOIN users u ON p.user_id = u.user_id
                LEFT JOIN clients c ON p.client_id = c.client_id
                ORDER BY p.created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `;
        }

        // Count query
        let totalProjects;
        if (search) {
            totalProjects = await sql`
                SELECT COUNT(*) as count
                FROM projects p
                JOIN users u ON p.user_id = u.user_id
                LEFT JOIN clients c ON p.client_id = c.client_id
                WHERE (p.name ILIKE ${`%${search}%`} OR p.description ILIKE ${`%${search}%`} OR u.name ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`} OR c.name ILIKE ${`%${search}%`})
            `;
        } else {
            totalProjects = await sql`
                SELECT COUNT(*) as count
                FROM projects p
                JOIN users u ON p.user_id = u.user_id
                LEFT JOIN clients c ON p.client_id = c.client_id
            `;
        }
        const totalItems = parseInt(totalProjects[0]?.count || 0, 10);
        const totalPages = Math.ceil(totalItems / limit);

        const stats = await sql`
            SELECT
                COUNT(*) AS total_projects,
                COUNT(*) FILTER (WHERE status = 'active') AS active_projects,
                COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_projects,
                COUNT(*) FILTER (WHERE status = 'archived') AS archived_projects,
                COUNT(*) FILTER (WHERE status = 'completed') AS completed_projects,
                COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_projects,
                COUNT(*) FILTER (WHERE type = 'client') AS client_projects,
                COUNT(*) FILTER (WHERE type = 'private') AS private_projects
            FROM projects
        `;

        res.status(200).json({
            response: true,
            projects,
            pagination: {
                current_page: page,
                total_pages: totalPages,
                total_items: totalItems,
                items_per_page: limit,
            },
            stats: stats[0]
        });
    } catch (error) {
        console.error('Error fetching admin projects:', error);
        res.status(500).json({ response: false, message: 'Błąd podczas pobierania projektów.' });
    }
};

export const updateProject = async (req, res) => {
    const { project_id } = req.params;
    const { user_id, name, description, type, status, start_date, end_date, warranty_until, icon, client_id } = req.body;
    const adminUser = await getActiveAdminOrError(user_id, res);
    if (!adminUser) return;

    try {
        const updatedProject = await sql`
            UPDATE projects
            SET
                name = ${name || null},
                description = ${description || null},
                type = ${type || null},
                status = ${status || null},
                start_date = ${start_date || null},
                end_date = ${end_date || null},
                warranty_until = ${warranty_until || null},
                icon = ${icon || null},
                client_id = ${client_id || null},
                updated_at = NOW()
            WHERE id = ${project_id}
            RETURNING *
        `;

        if (updatedProject.length === 0) {
            return res.status(404).json({ response: false, message: 'Projekt nie został znaleziony.' });
        }

        res.status(200).json({ response: true, message: 'Projekt został zaktualizowany pomyślnie.', project: updatedProject[0] });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ response: false, message: 'Błąd podczas aktualizacji projektu.' });
    }
};

export const getProject = async (req, res) => {
    const { project_id } = req.params;
    const { user_id } = req.body; // Admin user ID for authorization
    const adminUser = await getActiveAdminOrError(user_id, res);
    if (!adminUser) return;

    try {
        const project = await sql`
            SELECT
                p.id,
                p.name,
                p.description,
                p.type,
                p.status,
                p.start_date,
                p.end_date,
                p.warranty_until,
                p.icon,
                p.created_at,
                p.updated_at,
                p.user_id,
                p.client_id,
                u.name AS user_name,
                u.email AS user_email,
                c.name AS client_name
            FROM projects p
            JOIN users u ON p.user_id = u.user_id
            LEFT JOIN clients c ON p.client_id = c.client_id
            WHERE p.id = ${project_id}
        `;

        if (project.length === 0) {
            return res.status(404).json({ response: false, message: 'Projekt nie został znaleziony.' });
        }

        res.status(200).json({ response: true, project: project[0] });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ response: false, message: 'Błąd podczas pobierania projektu.' });
    }
};
