import { sql } from "../config/db.js";
import crypto from 'crypto';
import multer from 'multer';
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

async function getActiveUserOrError(user_id, res) {
  if (!user_id) { res.status(400).json({ error: "user_id is required" }); return null; }
  const rows = await sql`SELECT user_id, state FROM users WHERE user_id = ${user_id}`;
  if (rows.length === 0) { res.status(404).json({ error: "User not found" }); return null; }
  if (rows[0].state !== 'active') { res.status(403).json({ error: "Access denied. User is not active." }); return null; }
  return rows[0];
}

export const addFile = async (req, res) => {
  try {
    const { user_id, client_id, project_id, task_id, note_id, contract_id, status } = req.body;
    const user = await getActiveUserOrError(user_id, res); if (!user) return;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileType = req.file.mimetype;
    const fileSize = req.file.size;

    // Check file size limit based on user's premium level
    try {
      // Get user's premium level (default to 0 if not set)
      const userPremium = await sql`
        SELECT premium_level FROM users WHERE user_id = ${user_id}
      `;
      
      const premiumLevel = userPremium.length > 0 ? (userPremium[0].premium_level || 0) : 0;

      // Get file size limit for user's premium level (in MB)
      const filesLimit = await sql`
        SELECT premium_level_0, premium_level_1, premium_level_2 
        FROM limits 
        WHERE name = 'files_mb'
      `;

      if (filesLimit.length > 0) {
        // Get current total file size in MB
        const filesSize = await sql`
          SELECT COALESCE(SUM(file_size), 0) as total_size FROM files WHERE user_id = ${user_id}
        `;

        const currentSizeMB = Math.round((parseInt(filesSize[0]?.total_size || 0) / (1024 * 1024)) * 100) / 100;
        const newFileSizeMB = Math.round((fileSize / (1024 * 1024)) * 100) / 100;
        
        // Get limit based on premium level (in MB)
        let limitMB;
        switch (premiumLevel) {
          case 0: limitMB = filesLimit[0].premium_level_0; break;
          case 1: limitMB = filesLimit[0].premium_level_1; break;
          case 2: limitMB = filesLimit[0].premium_level_2; break;
          default: limitMB = filesLimit[0].premium_level_0;
        }

        const wouldExceedLimit = (currentSizeMB + newFileSizeMB) > limitMB;

        if (wouldExceedLimit) {
          return res.status(413).json({ 
            error: 'Limit rozmiaru plików został przekroczony',
            details: `Aktualny rozmiar: ${currentSizeMB}MB, limit: ${limitMB}MB, nowy plik: ${newFileSizeMB}MB`
          });
        }
      }
    } catch (limitError) {
      console.error('Error checking file size limit:', limitError);
      // Continue with upload if limit check fails (fallback behavior)
    }

    // Enforce 1MB limit for project icon uploads
    if (req.body.project_id && fileSize > 1024 * 1024) {
      return res.status(413).json({ error: 'Max file size 1MB for project icon' });
    }

    // Prefer raw for PDFs, auto for others. Use a separate folder if linked to a contract
    const isPdf = fileType === 'application/pdf' || /\.pdf$/i.test(fileName);
    const folder = contract_id ? 'myfreelance/contracts' : 'myfreelance/files';
    const cloudinaryOptions = { folder, resource_type: isPdf ? 'raw' : 'auto' };

    const uploadRes = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(cloudinaryOptions, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }).end(fileBuffer);
    });

    const id = crypto.randomUUID();
    const inserted = await sql`
      INSERT INTO files (
        id, user_id, file_name, file_path, file_type, file_size, status, file_url, client_id, project_id, task_id, note_id, file_created_at, file_updated_at
      ) VALUES (
        ${id}, ${user_id}, ${fileName}, ${uploadRes?.public_id || null}, ${fileType}, ${fileSize}, ${status || 'active'}, ${uploadRes?.secure_url || null}, ${client_id || null}, ${project_id || null}, ${task_id || null}, ${note_id || null}, NOW(), NOW()
      ) RETURNING *
    `;

    // Optionally link to contract.files array
    if (contract_id) {
      try {
        const rows = await sql`SELECT files, user_id FROM contracts WHERE id = ${contract_id}`;
        if (rows.length > 0 && (rows[0].user_id === user_id)) {
          const current = Array.isArray(rows[0].files) ? rows[0].files : [];
          const merged = Array.from(new Set([...current, inserted[0].id]));
          await sql`UPDATE contracts SET files = ${merged}, updated_at = NOW() WHERE id = ${contract_id}`;
        }
      } catch {}
    }

    res.status(201).json({ message: 'File uploaded', file: inserted[0] });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listFiles = async (req, res) => {
  try {
    const { user_id, client_id, project_id, task_id, note_id, limit = 50, offset = 0 } = req.body;
    const user = await getActiveUserOrError(user_id, res); if (!user) return;

    const filters = [];
    const params = [];
    let idx = 1;
    filters.push(`user_id = $${idx++}`); params.push(user_id);
    if (client_id) { filters.push(`client_id = $${idx++}`); params.push(client_id); }
    if (project_id) { filters.push(`project_id = $${idx++}`); params.push(project_id); }
    if (task_id) { filters.push(`task_id = $${idx++}`); params.push(task_id); }
    if (note_id) { filters.push(`note_id = $${idx++}`); params.push(note_id); }
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const query = `SELECT * FROM files ${whereClause} ORDER BY file_updated_at DESC LIMIT ${Math.min(Number(limit)||50,100)} OFFSET ${Math.max(Number(offset)||0,0)}`;
    const rows = await sql.query(query, params);
    res.json({ files: rows });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { user_id, id } = req.body;
    const user = await getActiveUserOrError(user_id, res); if (!user) return;
    if (!id) return res.status(400).json({ error: 'id is required' });
    const rows = await sql`SELECT id, user_id, file_path, file_type FROM files WHERE id = ${id}`;
    if (rows.length === 0) return res.status(404).json({ error: 'File not found' });
    if (user.type !== 'admin' && rows[0].user_id !== user_id) return res.status(403).json({ error: 'Access denied' });

    // Attempt Cloudinary delete first (best effort)
    const publicId = rows[0].file_path;
    if (publicId) {
      try {
        const isPdf = rows[0].file_type === 'application/pdf' || /pdf$/i.test(rows[0].file_type || '');
        await cloudinary.uploader.destroy(publicId, { resource_type: isPdf ? 'raw' : 'image' });
      } catch (e) {
        // ignore cloudinary errors, continue to DB delete
      }
    }

    // Remove references from contracts.files arrays
    try {
      await sql`UPDATE contracts SET files = array_remove(files, ${id}), updated_at = NOW() WHERE user_id = ${user_id} AND files @> ARRAY[${id}]`;
    } catch (e) {}

    // Delete file record
    await sql`DELETE FROM files WHERE id = ${id}`;
    res.json({ message: 'File deleted' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


