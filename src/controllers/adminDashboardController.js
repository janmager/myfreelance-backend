import { sql } from '../config/db.js';

async function getActiveAdminOrError(user_id, res) {
    try {
        const user = await sql`
            SELECT user_id, type FROM users 
            WHERE user_id = ${user_id} AND state = 'active'
        `;
        
        if (user.length === 0) {
            res.status(401).json({ 
                response: false, 
                message: 'Użytkownik nie istnieje lub jest nieaktywny' 
            });
            return null;
        }
        
        if (user[0].type !== 'admin') {
            res.status(403).json({ 
                response: false, 
                message: 'Brak uprawnień administratora' 
            });
            return null;
        }
        
        return user[0];
    } catch (error) {
        console.error('Error checking admin user:', error);
        res.status(500).json({ 
            response: false, 
            message: 'Błąd podczas weryfikacji użytkownika' 
        });
        return null;
    }
}

export async function getDashboardStats(req, res) {
    try {
        const { user_id } = req.body;
        
        const admin = await getActiveAdminOrError(user_id, res);
        if (!admin) return;

        // Users statistics
        const usersStats = await sql`
            SELECT 
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE state = 'active') as active_users,
                COUNT(*) FILTER (WHERE state = 'to-confirm') as pending_users,
                COUNT(*) FILTER (WHERE state = 'blocked') as blocked_users,
                COUNT(*) FILTER (WHERE state = 'deleted') as deleted_users,
                COUNT(*) FILTER (WHERE type = 'admin') as admin_users,
                COUNT(*) FILTER (WHERE type = 'user') as regular_users,
                COUNT(*) FILTER (WHERE premium_level = 0) as free_users,
                COUNT(*) FILTER (WHERE premium_level = 1) as premium_users,
                COUNT(*) FILTER (WHERE premium_level = 2) as gold_users
            FROM users
        `;

        // Clients statistics
        const clientsStats = await sql`
            SELECT 
                COUNT(*) as total_clients,
                COUNT(*) FILTER (WHERE status = 'active') as active_clients,
                COUNT(*) FILTER (WHERE status = 'archived') as archived_clients
            FROM clients
        `;

        // Projects statistics
        const projectsStats = await sql`
            SELECT 
                COUNT(*) as total_projects,
                COUNT(*) FILTER (WHERE status = 'active') as active_projects,
                COUNT(*) FILTER (WHERE status = 'inactive') as inactive_projects,
                COUNT(*) FILTER (WHERE status = 'archived') as archived_projects
            FROM projects
        `;

        // Tasks statistics
        const tasksStats = await sql`
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(*) FILTER (WHERE status = 'todo') as todo_tasks,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
                COUNT(*) FILTER (WHERE status = 'done') as done_tasks
            FROM tasks
        `;

        // Notes statistics
        const notesStats = await sql`
            SELECT 
                COUNT(*) as total_notes,
                COUNT(*) FILTER (WHERE type = 'client') as client_notes,
                COUNT(*) FILTER (WHERE type = 'idea') as idea_notes,
                COUNT(*) FILTER (WHERE type = 'private') as private_notes
            FROM notes
        `;

        // Contracts statistics
        const contractsStats = await sql`
            SELECT 
                COUNT(*) as total_contracts,
                COUNT(*) FILTER (WHERE status = 'draft') as draft_contracts,
                COUNT(*) FILTER (WHERE status = 'active') as active_contracts,
                COUNT(*) FILTER (WHERE status = 'archived') as archived_contracts,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_contracts
            FROM contracts
        `;

        // Links statistics
        const linksStats = await sql`
            SELECT 
                COUNT(*) as total_links,
                COUNT(*) FILTER (WHERE link_type = 'website') as website_links,
                COUNT(*) FILTER (WHERE link_type = 'social') as social_links,
                COUNT(*) FILTER (WHERE link_type = 'document') as document_links
            FROM links
        `;

        // Files statistics
        const filesStats = await sql`
            SELECT 
                COUNT(*) as total_files,
                COUNT(*) FILTER (WHERE status = 'active') as active_files,
                COUNT(*) FILTER (WHERE status = 'deleted') as deleted_files,
                COALESCE(SUM(file_size), 0) as total_size_bytes
            FROM files
        `;

        // Valuations statistics
        const valuationsStats = await sql`
            SELECT 
                COUNT(*) as total_valuations,
                COUNT(*) FILTER (WHERE status = 'draft') as draft_valuations,
                COUNT(*) FILTER (WHERE status = 'sent') as sent_valuations,
                COUNT(*) FILTER (WHERE status = 'active') as active_valuations,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_valuations,
                COUNT(*) FILTER (WHERE status = 'inactive') as inactive_valuations
            FROM valuations
        `;

        // Recent activity (last 7 days)
        const recentActivity = await sql`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE register_at >= NOW() - INTERVAL '7 days') as new_users,
                (SELECT COUNT(*) FROM clients WHERE created_at >= NOW() - INTERVAL '7 days') as new_clients,
                (SELECT COUNT(*) FROM projects WHERE created_at >= NOW() - INTERVAL '7 days') as new_projects,
                (SELECT COUNT(*) FROM tasks WHERE created_at >= NOW() - INTERVAL '7 days') as new_tasks,
                (SELECT COUNT(*) FROM notes WHERE created_at >= NOW() - INTERVAL '7 days') as new_notes,
                (SELECT COUNT(*) FROM contracts WHERE created_at >= NOW() - INTERVAL '7 days') as new_contracts,
                (SELECT COUNT(*) FROM files WHERE file_created_at >= NOW() - INTERVAL '7 days') as new_files,
                (SELECT COUNT(*) FROM valuations WHERE created_at >= NOW() - INTERVAL '7 days') as new_valuations
        `;

        // System overview
        const systemOverview = await sql`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE logged_at >= NOW() - INTERVAL '24 hours') as active_users_24h,
                (SELECT COUNT(*) FROM users WHERE logged_at >= NOW() - INTERVAL '7 days') as active_users_7d,
                (SELECT COUNT(*) FROM users WHERE logged_at >= NOW() - INTERVAL '30 days') as active_users_30d
        `;

        const dashboard = {
            users: usersStats[0] || {},
            clients: clientsStats[0] || {},
            projects: projectsStats[0] || {},
            tasks: tasksStats[0] || {},
            notes: notesStats[0] || {},
            contracts: contractsStats[0] || {},
            links: linksStats[0] || {},
            files: {
                ...filesStats[0] || {},
                total_size_mb: Math.round((filesStats[0]?.total_size_bytes || 0) / (1024 * 1024) * 100) / 100
            },
            valuations: valuationsStats[0] || {},
            recent_activity: recentActivity[0] || {},
            system_overview: systemOverview[0] || {}
        };

        res.status(200).json({
            response: true,
            dashboard: dashboard
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            response: false,
            message: 'Błąd podczas pobierania statystyk dashboardu'
        });
    }
}
