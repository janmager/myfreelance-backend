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

export const getSystemSettings = async (req, res) => {
    const { user_id } = req.body;
    const adminUser = await getActiveAdminOrError(user_id, res);
    if (!adminUser) return;

    try {
        const settings = await sql`
            SELECT id, name, value, description, created_at, updated_at
            FROM system
            ORDER BY name ASC
        `;

        res.status(200).json({
            response: true,
            settings: settings || []
        });
    } catch (error) {
        console.error('Error fetching system settings:', error);
        res.status(500).json({ 
            response: false, 
            message: 'Błąd podczas pobierania ustawień systemu.' 
        });
    }
};

export const updateSystemSetting = async (req, res) => {
    const { user_id, name, value } = req.body;
    const adminUser = await getActiveAdminOrError(user_id, res);
    if (!adminUser) return;

    try {
        // Validate required fields
        if (!name || value === undefined) {
            return res.status(400).json({
                response: false,
                message: 'Nazwa ustawienia i wartość są wymagane.'
            });
        }

        // Check if setting exists
        const existingSetting = await sql`
            SELECT id, name, value
            FROM system
            WHERE name = ${name}
        `;

        if (existingSetting.length === 0) {
            return res.status(404).json({
                response: false,
                message: 'Ustawienie nie zostało znalezione.'
            });
        }

        // Update the setting
        const updatedSetting = await sql`
            UPDATE system
            SET value = ${value}, updated_at = CURRENT_TIMESTAMP
            WHERE name = ${name}
            RETURNING id, name, value, description, updated_at
        `;

        if (updatedSetting.length === 0) {
            return res.status(500).json({
                response: false,
                message: 'Nie udało się zaktualizować ustawienia.'
            });
        }

        res.status(200).json({
            response: true,
            message: 'Ustawienie zostało zaktualizowane pomyślnie.',
            setting: updatedSetting[0]
        });
    } catch (error) {
        console.error('Error updating system setting:', error);
        res.status(500).json({ 
            response: false, 
            message: 'Błąd podczas aktualizacji ustawienia.' 
        });
    }
};

export const createSystemSetting = async (req, res) => {
    const { user_id, name, value, description } = req.body;
    const adminUser = await getActiveAdminOrError(user_id, res);
    if (!adminUser) return;

    try {
        // Validate required fields
        if (!name || value === undefined) {
            return res.status(400).json({
                response: false,
                message: 'Nazwa ustawienia i wartość są wymagane.'
            });
        }

        // Check if setting already exists
        const existingSetting = await sql`
            SELECT id, name
            FROM system
            WHERE name = ${name}
        `;

        if (existingSetting.length > 0) {
            return res.status(409).json({
                response: false,
                message: 'Ustawienie o tej nazwie już istnieje.'
            });
        }

        // Create the setting
        const newSetting = await sql`
            INSERT INTO system (name, value, description)
            VALUES (${name}, ${value}, ${description || ''})
            RETURNING id, name, value, description, created_at, updated_at
        `;

        res.status(201).json({
            response: true,
            message: 'Ustawienie zostało utworzone pomyślnie.',
            setting: newSetting[0]
        });
    } catch (error) {
        console.error('Error creating system setting:', error);
        res.status(500).json({ 
            response: false, 
            message: 'Błąd podczas tworzenia ustawienia.' 
        });
    }
};

export const bulkUpdateSystemSettings = async (req, res) => {
    const { user_id, settings } = req.body;
    const adminUser = await getActiveAdminOrError(user_id, res);
    if (!adminUser) return;

    try {
        // Validate required fields
        if (!settings || !Array.isArray(settings)) {
            return res.status(400).json({
                response: false,
                message: 'Lista ustawień jest wymagana.'
            });
        }

        // Validate each setting
        for (const setting of settings) {
            if (!setting.id || !setting.name || setting.value === undefined) {
                return res.status(400).json({
                    response: false,
                    message: 'Każde ustawienie musi mieć id, name i value.'
                });
            }
        }

        // Update all settings in a transaction
        const updatedSettings = [];
        
        for (const setting of settings) {
            const updatedSetting = await sql`
                UPDATE system
                SET value = ${setting.value}, 
                    description = ${setting.description || ''}, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ${setting.id} AND name = ${setting.name}
                RETURNING id, name, value, description, updated_at
            `;

            if (updatedSetting.length > 0) {
                updatedSettings.push(updatedSetting[0]);
            }
        }

        // Fetch all updated settings to return
        const allSettings = await sql`
            SELECT id, name, value, description, created_at, updated_at
            FROM system
            ORDER BY name ASC
        `;

        res.status(200).json({
            response: true,
            message: 'Ustawienia zostały zaktualizowane pomyślnie.',
            settings: allSettings || []
        });
    } catch (error) {
        console.error('Error bulk updating system settings:', error);
        res.status(500).json({ 
            response: false, 
            message: 'Błąd podczas aktualizacji ustawień.' 
        });
    }
};

export const deleteSystemSetting = async (req, res) => {
    const { user_id } = req.body;
    const { name } = req.params;
    const adminUser = await getActiveAdminOrError(user_id, res);
    if (!adminUser) return;

    try {
        // Check if setting exists
        const existingSetting = await sql`
            SELECT id, name
            FROM system
            WHERE name = ${name}
        `;

        if (existingSetting.length === 0) {
            return res.status(404).json({
                response: false,
                message: 'Ustawienie nie zostało znalezione.'
            });
        }

        // Prevent deletion of critical settings
        const criticalSettings = ['maintenance_mode'];
        if (criticalSettings.includes(name)) {
            return res.status(403).json({
                response: false,
                message: 'Nie można usunąć tego ustawienia systemowego.'
            });
        }

        // Delete the setting
        const deletedSetting = await sql`
            DELETE FROM system
            WHERE name = ${name}
            RETURNING id, name
        `;

        if (deletedSetting.length === 0) {
            return res.status(500).json({
                response: false,
                message: 'Nie udało się usunąć ustawienia.'
            });
        }

        res.status(200).json({
            response: true,
            message: 'Ustawienie zostało usunięte pomyślnie.',
            setting: deletedSetting[0]
        });
    } catch (error) {
        console.error('Error deleting system setting:', error);
        res.status(500).json({ 
            response: false, 
            message: 'Błąd podczas usuwania ustawienia.' 
        });
    }
};
