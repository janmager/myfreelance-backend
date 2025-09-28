import { sql } from '../config/db.js';

export const adminAuth = async (req, res, next) => {
    try {
        const { user_id } = req.body;
        
        if (!user_id) {
            return res.status(401).json({
                response: false,
                message: 'user_id jest wymagane'
            });
        }

        // Sprawdź czy użytkownik istnieje i ma uprawnienia admina
        const user = await sql`
            SELECT user_id, type, state FROM users WHERE user_id = ${user_id}
        `;

        if (user.length === 0) {
            return res.status(404).json({
                response: false,
                message: 'Użytkownik nie został znaleziony'
            });
        }

        if (user[0].state !== 'active') {
            return res.status(403).json({
                response: false,
                message: 'Użytkownik nie jest aktywny'
            });
        }

        if (user[0].type !== 'admin') {
            return res.status(403).json({
                response: false,
                message: 'Brak uprawnień administratora'
            });
        }

        // Dodaj informacje o użytkowniku do request
        req.adminUser = user[0];
        next();
    } catch (error) {
        console.error('Error in adminAuth middleware:', error);
        res.status(500).json({
            response: false,
            message: 'Błąd serwera podczas weryfikacji uprawnień'
        });
    }
};
