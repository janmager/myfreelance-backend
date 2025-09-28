import express from 'express';
import { sql } from '../config/db.js';

const router = express.Router();

// Check maintenance mode status
router.get('/status', async (req, res) => {
  try {
    const result = await sql`
      SELECT value FROM system 
      WHERE name = 'maintenance_mode'
    `;
    
    const isMaintenanceMode = result.length > 0 && (result[0].value === 1 || result[0].value === '1');
    
    res.json({
      maintenance_mode: isMaintenanceMode
    });
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    res.status(500).json({
      error: 'Failed to check maintenance mode',
      maintenance_mode: false
    });
  }
});

export default router;
