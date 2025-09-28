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

export async function getAdminLimits(req, res) {
    try {
        const { user_id } = req.body;
        
        const admin = await getActiveAdminOrError(user_id, res);
        if (!admin) return;
        
        const limits = await sql`
            SELECT * FROM limits ORDER BY name
        `;
        
        res.status(200).json({
            response: true,
            limits: limits
        });
    } catch (error) {
        console.error('Error fetching admin limits:', error);
        res.status(500).json({
            response: false,
            message: 'Błąd podczas pobierania limitów'
        });
    }
}

export async function updateAdminLimits(req, res) {
    try {
        const { user_id, limits } = req.body;
        
        const admin = await getActiveAdminOrError(user_id, res);
        if (!admin) return;
        
        if (!limits || !Array.isArray(limits)) {
            return res.status(400).json({
                response: false,
                message: 'Nieprawidłowe dane limitów'
            });
        }
        
        // Validate limits data
        for (const limit of limits) {
            if (!limit.name || 
                typeof limit.premium_level_0 !== 'number' || 
                typeof limit.premium_level_1 !== 'number' || 
                typeof limit.premium_level_2 !== 'number') {
                return res.status(400).json({
                    response: false,
                    message: `Nieprawidłowe dane dla limitu: ${limit.name}`
                });
            }
            
            // Ensure values are non-negative
            if (limit.premium_level_0 < 0 || 
                limit.premium_level_1 < 0 || 
                limit.premium_level_2 < 0) {
                return res.status(400).json({
                    response: false,
                    message: `Wartości limitów muszą być nieujemne dla: ${limit.name}`
                });
            }
        }
        
        // Update each limit
        for (const limit of limits) {
            await sql`
                UPDATE limits 
                SET 
                    premium_level_0 = ${limit.premium_level_0},
                    premium_level_1 = ${limit.premium_level_1},
                    premium_level_2 = ${limit.premium_level_2},
                    updated_at = NOW()
                WHERE name = ${limit.name}
            `;
        }
        
        // Get updated limits
        const updatedLimits = await sql`
            SELECT * FROM limits ORDER BY name
        `;
        
        res.status(200).json({
            response: true,
            message: 'Limity zostały zaktualizowane',
            limits: updatedLimits
        });
    } catch (error) {
        console.error('Error updating admin limits:', error);
        res.status(500).json({
            response: false,
            message: 'Błąd podczas aktualizacji limitów'
        });
    }
}

export async function getAdminLimitsStats(req, res) {
    try {
        const { user_id } = req.body;
        
        const admin = await getActiveAdminOrError(user_id, res);
        if (!admin) return;
        
        // Get user counts by premium level
        const userStats = await sql`
            SELECT 
                premium_level,
                COUNT(*) as user_count
            FROM users 
            WHERE state = 'active'
            GROUP BY premium_level
            ORDER BY premium_level
        `;
        
        // Get limits
        const limits = await sql`
            SELECT * FROM limits ORDER BY name
        `;
        
        // Get total usage statistics
        const [totalClients, totalProjects, totalNotes, totalContracts, totalFiles, totalLinks, totalTasks, totalValuations] = await Promise.all([
            sql`SELECT COUNT(*) as count FROM clients`,
            sql`SELECT COUNT(*) as count FROM projects`,
            sql`SELECT COUNT(*) as count FROM notes`,
            sql`SELECT COUNT(*) as count FROM contracts`,
            sql`SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size FROM files`,
            sql`SELECT COUNT(*) as count FROM links`,
            sql`SELECT COUNT(*) as count FROM tasks`,
            sql`SELECT COUNT(*) as count FROM valuations`
        ]);
        
        const stats = {
            users_by_level: userStats,
            total_usage: {
                clients: parseInt(totalClients[0]?.count || 0),
                projects: parseInt(totalProjects[0]?.count || 0),
                notes: parseInt(totalNotes[0]?.count || 0),
                contracts: parseInt(totalContracts[0]?.count || 0),
                files: {
                    count: parseInt(totalFiles[0]?.count || 0),
                    total_size_mb: Math.round((parseInt(totalFiles[0]?.total_size || 0) / (1024 * 1024)) * 100) / 100
                },
                links: parseInt(totalLinks[0]?.count || 0),
                tasks: parseInt(totalTasks[0]?.count || 0),
                valuations: parseInt(totalValuations[0]?.count || 0)
            },
            limits: limits
        };
        
        res.status(200).json({
            response: true,
            stats: stats
        });
    } catch (error) {
        console.error('Error fetching admin limits stats:', error);
        res.status(500).json({
            response: false,
            message: 'Błąd podczas pobierania statystyk limitów'
        });
    }
}
