import express from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import { 
    getUsers, 
    getUserById, 
    updateUser, 
    deleteUser, 
    getSystemStats 
} from '../controllers/adminController.js';

const router = express.Router();

// Wszystkie route wymagają autoryzacji admina
router.use(adminAuth);

// Statystyki systemu
router.post('/stats', getSystemStats);

// Zarządzanie użytkownikami
router.post('/users', getUsers);
router.get('/users/:user_id', getUserById);
router.put('/users/:user_id', updateUser);
router.delete('/users/:user_id', deleteUser);

export default router;
