import express from 'express';
import { addContract, editContract, addFilesToContract, listContracts, listContractFiles, removeFileFromContract } from '../controllers/contractsController.js';

const router = express.Router();

// Mounted under /api/contracts
router.post('/add', addContract);
router.put('/edit', editContract);
router.post('/add-files', addFilesToContract);
router.post('/list', listContracts);
router.post('/list-files', listContractFiles);
router.post('/remove-file', removeFileFromContract);

export default router;


