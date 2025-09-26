import { sql } from '../config/db.js';

// Add link
export const addLink = async (req, res) => {
  try {
    const { user_id, link_url, client_id, project_id, link_title, link_description, link_type } = req.body;

    if (!user_id || !link_url) {
      return res.status(400).json({ error: 'user_id and link_url are required' });
    }

    // Verify user exists and has correct type
    const userCheck = await sql`
      SELECT user_id, type FROM users WHERE user_id = ${user_id}
    `;
    
    if (userCheck.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!['user', 'admin'].includes(userCheck[0].type)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify client exists if provided
    if (client_id) {
      const clientCheck = await sql`
        SELECT client_id FROM clients WHERE client_id = ${client_id} AND user_id = ${user_id}
      `;
      
      if (clientCheck.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }
    }

    // Verify project exists if provided
    if (project_id) {
      const projectCheck = await sql`
        SELECT id FROM projects WHERE id = ${project_id} AND user_id = ${user_id}
      `;
      
      if (projectCheck.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
    }

    const result = await sql`
      INSERT INTO links (user_id, link_url, client_id, project_id, link_title, link_description, link_type)
      VALUES (${user_id}, ${link_url}, ${client_id || null}, ${project_id || null}, ${link_title || null}, ${link_description || null}, ${link_type || 'general'})
      RETURNING *
    `;

    res.status(201).json({
      message: 'Link created successfully',
      link: result[0]
    });
  } catch (error) {
    console.error('Error adding link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Edit link
export const editLink = async (req, res) => {
  try {
    const { user_id, id, link_url, client_id, project_id, link_title, link_description, link_type } = req.body;

    if (!user_id || !id) {
      return res.status(400).json({ error: 'user_id and id are required' });
    }

    // Verify user exists and has correct type
    const userCheck = await sql`
      SELECT user_id, type FROM users WHERE user_id = ${user_id}
    `;
    
    if (userCheck.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!['user', 'admin'].includes(userCheck[0].type)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify link exists and belongs to user
    const linkCheck = await sql`
      SELECT id FROM links WHERE id = ${id} AND user_id = ${user_id}
    `;
    
    if (linkCheck.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Verify client exists if provided
    if (client_id) {
      const clientCheck = await sql`
        SELECT client_id FROM clients WHERE client_id = ${client_id} AND user_id = ${user_id}
      `;
      
      if (clientCheck.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }
    }

    // Verify project exists if provided
    if (project_id) {
      const projectCheck = await sql`
        SELECT id FROM projects WHERE id = ${project_id} AND user_id = ${user_id}
      `;
      
      if (projectCheck.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
    }

    const result = await sql`
      UPDATE links 
      SET 
        link_url = COALESCE(${link_url}, link_url),
        client_id = ${client_id || null},
        project_id = ${project_id || null},
        link_title = COALESCE(${link_title}, link_title),
        link_description = COALESCE(${link_description}, link_description),
        link_type = COALESCE(${link_type}, link_type),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user_id}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json({
      message: 'Link updated successfully',
      link: result[0]
    });
  } catch (error) {
    console.error('Error editing link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete link
export const deleteLink = async (req, res) => {
  try {
    const { user_id, id } = req.body;

    if (!user_id || !id) {
      return res.status(400).json({ error: 'user_id and id are required' });
    }

    // Verify user exists and has correct type
    const userCheck = await sql`
      SELECT user_id, type FROM users WHERE user_id = ${user_id}
    `;
    
    if (userCheck.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!['user', 'admin'].includes(userCheck[0].type)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await sql`
      DELETE FROM links 
      WHERE id = ${id} AND user_id = ${user_id}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json({
      message: 'Link deleted successfully',
      link: result[0]
    });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get links list
export const getLinks = async (req, res) => {
  try {
    const { user_id, client_id, project_id, link_type } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Verify user exists and has correct type
    const userCheck = await sql`
      SELECT user_id, type FROM users WHERE user_id = ${user_id}
    `;
    
    if (userCheck.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!['user', 'admin'].includes(userCheck[0].type)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = sql`
      SELECT 
        l.*,
        c.name as client_name,
        p.name as project_name
      FROM links l
      LEFT JOIN clients c ON l.client_id = c.client_id
      LEFT JOIN projects p ON l.project_id = p.id
      WHERE l.user_id = ${user_id}
    `;

    // Add filters if provided
    if (client_id) {
      query = sql`
        SELECT 
          l.*,
          c.name as client_name,
          p.name as project_name
        FROM links l
        LEFT JOIN clients c ON l.client_id = c.client_id
        LEFT JOIN projects p ON l.project_id = p.id
        WHERE l.user_id = ${user_id} AND l.client_id = ${client_id}
      `;
    }

    if (project_id) {
      query = sql`
        SELECT 
          l.*,
          c.name as client_name,
          p.name as project_name
        FROM links l
        LEFT JOIN clients c ON l.client_id = c.client_id
        LEFT JOIN projects p ON l.project_id = p.id
        WHERE l.user_id = ${user_id} AND l.project_id = ${project_id}
      `;
    }

    if (link_type) {
      query = sql`
        SELECT 
          l.*,
          c.name as client_name,
          p.name as project_name
        FROM links l
        LEFT JOIN clients c ON l.client_id = c.client_id
        LEFT JOIN projects p ON l.project_id = p.id
        WHERE l.user_id = ${user_id} AND l.link_type = ${link_type}
      `;
    }

    const links = await query;

    res.json({
      links: links || []
    });
  } catch (error) {
    console.error('Error getting links:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
