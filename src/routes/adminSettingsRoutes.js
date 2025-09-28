import express from 'express';
import { 
    getSystemSettings, 
    updateSystemSetting, 
    createSystemSetting, 
    deleteSystemSetting,
    bulkUpdateSystemSettings
} from '../controllers/adminSettingsController.js';

const router = express.Router();

// Get all system settings
router.post('/', getSystemSettings);

// Bulk update system settings (must be before /:name route)
router.put('/bulk-update', bulkUpdateSystemSettings);

// Update a system setting
router.put('/:name', updateSystemSetting);

// Create a new system setting
router.post('/create', createSystemSetting);

// Delete a system setting
router.delete('/:name', deleteSystemSetting);

export default router;
