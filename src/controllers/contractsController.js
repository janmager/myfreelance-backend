import { sql } from "../config/db.js";
import crypto from 'crypto';

async function getActiveUserOrError(user_id, res) {
  if (!user_id) { res.status(400).json({ error: 'user_id is required' }); return null; }
  const rows = await sql`SELECT user_id, state, type FROM users WHERE user_id = ${user_id}`;
  if (rows.length === 0) { res.status(404).json({ error: 'User not found' }); return null; }
  if (rows[0].state !== 'active') { res.status(403).json({ error: 'Access denied. User is not active.' }); return null; }
  return rows[0];
}

export const addContract = async (req, res) => {
  try {
    const { user_id, name, client_id, project_id, signed_at, status, type, description } = req.body;
    const user = await getActiveUserOrError(user_id, res); if (!user) return;
    if (!name || !status || !type || !signed_at) {
      return res.status(400).json({ error: 'name, status, type, signed_at are required' });
    }
    if (client_id) {
      const cl = await sql`SELECT client_id, user_id FROM clients WHERE client_id = ${client_id}`;
      if (cl.length === 0) return res.status(404).json({ error: 'Client not found' });
      if (user.type !== 'admin' && cl[0].user_id !== user_id) return res.status(403).json({ error: 'Access denied. Client not owned by user.' });
    }
    if (project_id) {
      const pr = await sql`SELECT id, user_id, client_id FROM projects WHERE id = ${project_id}`;
      if (pr.length === 0) return res.status(404).json({ error: 'Project not found' });
      if (user.type !== 'admin' && pr[0].user_id !== user_id) return res.status(403).json({ error: 'Access denied. Project not owned by user.' });
      if (client_id && pr[0].client_id && pr[0].client_id !== client_id) return res.status(400).json({ error: 'Project does not belong to selected client' });
    }
    const id = crypto.randomUUID();
    const inserted = await sql`
      INSERT INTO contracts (id, user_id, name, client_id, project_id, signed_at, created_at, updated_at, files, status, type, description)
      VALUES (${id}, ${user_id}, ${name}, ${client_id || null}, ${project_id || null}, ${signed_at}, NOW(), NOW(), ${[]}, ${status}, ${type}, ${description || null})
      RETURNING *
    `;
    res.status(201).json({ message: 'Contract created', contract: inserted[0] });
  } catch (e) {
    console.error('addContract error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const editContract = async (req, res) => {
  try {
    const { user_id, id, name, client_id, project_id, signed_at, status, type, description } = req.body;
    const user = await getActiveUserOrError(user_id, res); if (!user) return;
    if (!id) return res.status(400).json({ error: 'id is required' });
    const rows = await sql`SELECT * FROM contracts WHERE id = ${id}`;
    if (rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    const c = rows[0];
    if (user.type !== 'admin' && c.user_id !== user_id) return res.status(403).json({ error: 'Access denied' });
    if (client_id !== undefined && client_id !== null && client_id) {
      const cl = await sql`SELECT client_id, user_id FROM clients WHERE client_id = ${client_id}`;
      if (cl.length === 0) return res.status(404).json({ error: 'Client not found' });
      if (user.type !== 'admin' && cl[0].user_id !== user_id) return res.status(403).json({ error: 'Access denied. Client not owned by user.' });
    }
    if (project_id !== undefined && project_id !== null && project_id) {
      const pr = await sql`SELECT id, user_id, client_id FROM projects WHERE id = ${project_id}`;
      if (pr.length === 0) return res.status(404).json({ error: 'Project not found' });
      if (user.type !== 'admin' && pr[0].user_id !== user_id) return res.status(403).json({ error: 'Access denied. Project not owned by user.' });
      const targetClient = client_id !== undefined ? client_id : c.client_id;
      if (targetClient && pr[0].client_id && pr[0].client_id !== targetClient) return res.status(400).json({ error: 'Project does not belong to selected client' });
    }
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (client_id !== undefined) updates.client_id = client_id;
    if (project_id !== undefined) updates.project_id = project_id;
    if (signed_at !== undefined) updates.signed_at = signed_at;
    if (status !== undefined) updates.status = status;
    if (type !== undefined) updates.type = type;
    if (description !== undefined) updates.description = description;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    const fields = []; const values = [];
    Object.entries(updates).forEach(([k, v]) => { fields.push(`${k} = $${values.length + 1}`); values.push(v); });
    fields.push('updated_at = NOW()');
    const query = `UPDATE contracts SET ${fields.join(', ')} WHERE id = $${values.length + 1} RETURNING *`;
    const updated = await sql.query(query, [...values, id]);
    res.json({ message: 'Contract updated', contract: updated[0] });
  } catch (e) {
    console.error('editContract error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addFilesToContract = async (req, res) => {
  try {
    const { user_id, id, file_ids } = req.body;
    const user = await getActiveUserOrError(user_id, res); if (!user) return;
    if (!id || !Array.isArray(file_ids) || file_ids.length === 0) return res.status(400).json({ error: 'id and file_ids[] required' });
    const rows = await sql`SELECT * FROM contracts WHERE id = ${id}`;
    if (rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    const c = rows[0];
    if (user.type !== 'admin' && c.user_id !== user_id) return res.status(403).json({ error: 'Access denied' });
    const currentFiles = Array.isArray(c.files) ? c.files : [];
    const merged = Array.from(new Set([...currentFiles, ...file_ids]));
    const updated = await sql`UPDATE contracts SET files = ${merged}, updated_at = NOW() WHERE id = ${id} RETURNING *`;
    res.json({ message: 'Files added to contract', contract: updated[0] });
  } catch (e) {
    console.error('addFilesToContract error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listContracts = async (req, res) => {
  try {
    const { user_id, client_id, project_id, limit, offset } = req.body;
    const user = await getActiveUserOrError(user_id, res); if (!user) return;

    const filters = [];
    const params = [];
    let idx = 1;
    filters.push(`c.user_id = $${idx++}`); params.push(user_id);
    if (client_id) { filters.push(`c.client_id = $${idx++}`); params.push(client_id); }
    if (project_id) { filters.push(`c.project_id = $${idx++}`); params.push(project_id); }
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const lim = Math.min(Number(limit) || 50, 100);
    const off = Math.max(Number(offset) || 0, 0);
    const query = `
      SELECT c.*, p.name as project_name 
      FROM contracts c 
      LEFT JOIN projects p ON c.project_id = p.id 
      ${whereClause} 
      ORDER BY c.updated_at DESC 
      LIMIT ${lim} OFFSET ${off}
    `;
    const rows = await sql.query(query, params);
    res.json({ contracts: rows });
  } catch (e) {
    console.error('listContracts error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listContractFiles = async (req, res) => {
  try {
    const { user_id, id } = req.body; // contract id
    const user = await getActiveUserOrError(user_id, res); if (!user) return;
    if (!id) return res.status(400).json({ error: 'id is required' });
    const rows = await sql`SELECT user_id, files FROM contracts WHERE id = ${id}`;
    if (rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    if (user.type !== 'admin' && rows[0].user_id !== user_id) return res.status(403).json({ error: 'Access denied' });
    const fileIds = Array.isArray(rows[0].files) ? rows[0].files : [];
    if (fileIds.length === 0) return res.json({ files: [] });
    const files = await sql`SELECT * FROM files WHERE user_id = ${user_id} AND id = ANY(${fileIds}) ORDER BY file_updated_at DESC`;
    res.json({ files });
  } catch (e) {
    console.error('listContractFiles error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeFileFromContract = async (req, res) => {
  try {
    const { user_id, id, file_id } = req.body; // contract id, file id
    const user = await getActiveUserOrError(user_id, res); if (!user) return;
    if (!id || !file_id) return res.status(400).json({ error: 'id and file_id are required' });
    const rows = await sql`SELECT user_id, files FROM contracts WHERE id = ${id}`;
    if (rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    if (user.type !== 'admin' && rows[0].user_id !== user_id) return res.status(403).json({ error: 'Access denied' });
    const current = Array.isArray(rows[0].files) ? rows[0].files : [];
    const next = current.filter((fid) => fid !== file_id);
    const updated = await sql`UPDATE contracts SET files = ${next}, updated_at = NOW() WHERE id = ${id} RETURNING *`;
    res.json({ message: 'File unlinked from contract', contract: updated[0] });
  } catch (e) {
    console.error('removeFileFromContract error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteContract = async (req, res) => {
  try {
    const { user_id, id } = req.body;
    const user = await getActiveUserOrError(user_id, res); if (!user) return;
    if (!id) return res.status(400).json({ error: 'id is required' });
    const rows = await sql`SELECT user_id FROM contracts WHERE id = ${id}`;
    if (rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    if (user.type !== 'admin' && rows[0].user_id !== user_id) return res.status(403).json({ error: 'Access denied' });
    await sql`DELETE FROM contracts WHERE id = ${id}`;
    res.json({ message: 'Contract deleted' });
  } catch (e) {
    console.error('deleteContract error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};


