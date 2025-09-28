import { sql } from '../config/db.js';

// Get all valuations for a user
export async function getValuations(req, res) {
  try {
    const { user_id, search, status, client_id, project_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    let query = sql`
      SELECT 
        v.*,
        c.name as client_name,
        p.name as project_name
      FROM valuations v
      LEFT JOIN clients c ON v.client_id = c.client_id
      LEFT JOIN projects p ON v.project_id = p.id
      WHERE v.user_id = ${user_id}
    `;

    // Add filters
    if (search) {
      query = sql`
        SELECT 
          v.*,
          c.name as client_name,
          p.name as project_name
        FROM valuations v
        LEFT JOIN clients c ON v.client_id = c.client_id
        LEFT JOIN projects p ON v.project_id = p.id
        WHERE v.user_id = ${user_id}
        AND (
          v.title ILIKE ${'%' + search + '%'} OR
          v.description ILIKE ${'%' + search + '%'} OR
          c.name ILIKE ${'%' + search + '%'} OR
          p.name ILIKE ${'%' + search + '%'}
        )
      `;
    }

    if (status && status !== 'all') {
      query = sql`
        SELECT 
          v.*,
          c.name as client_name,
          p.name as project_name
        FROM valuations v
        LEFT JOIN clients c ON v.client_id = c.client_id
        LEFT JOIN projects p ON v.project_id = p.id
        WHERE v.user_id = ${user_id}
        AND v.status = ${status}
        ${search ? sql`AND (
          v.title ILIKE ${'%' + search + '%'} OR
          v.description ILIKE ${'%' + search + '%'} OR
          c.name ILIKE ${'%' + search + '%'} OR
          p.name ILIKE ${'%' + search + '%'}
        )` : sql``}
      `;
    }

    if (client_id) {
      query = sql`
        SELECT 
          v.*,
          c.name as client_name,
          p.name as project_name
        FROM valuations v
        LEFT JOIN clients c ON v.client_id = c.client_id
        LEFT JOIN projects p ON v.project_id = p.id
        WHERE v.user_id = ${user_id}
        AND v.client_id = ${client_id}
        ${status && status !== 'all' ? sql`AND v.status = ${status}` : sql``}
        ${search ? sql`AND (
          v.title ILIKE ${'%' + search + '%'} OR
          v.description ILIKE ${'%' + search + '%'} OR
          c.name ILIKE ${'%' + search + '%'} OR
          p.name ILIKE ${'%' + search + '%'}
        )` : sql``}
      `;
    }

    if (project_id) {
      query = sql`
        SELECT 
          v.*,
          c.name as client_name,
          p.name as project_name
        FROM valuations v
        LEFT JOIN clients c ON v.client_id = c.client_id
        LEFT JOIN projects p ON v.project_id = p.id
        WHERE v.user_id = ${user_id}
        AND v.project_id = ${project_id}
        ${status && status !== 'all' ? sql`AND v.status = ${status}` : sql``}
        ${search ? sql`AND (
          v.title ILIKE ${'%' + search + '%'} OR
          v.description ILIKE ${'%' + search + '%'} OR
          c.name ILIKE ${'%' + search + '%'} OR
          p.name ILIKE ${'%' + search + '%'}
        )` : sql``}
      `;
    }

    query = sql`${query} ORDER BY v.created_at DESC`;

    const valuations = await query;

    res.status(200).json({
      response: true,
      valuations: valuations || []
    });

  } catch (error) {
    console.error('Error getting valuations:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas pobierania wycen'
    });
  }
}

// Get single valuation
export async function getValuation(req, res) {
  try {
    const { user_id, valuation_id } = req.body;

    if (!user_id || !valuation_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id i valuation_id są wymagane'
      });
    }

    const valuation = await sql`
      SELECT 
        v.*,
        c.name as client_name,
        c.email as client_email,
        p.name as project_name
      FROM valuations v
      LEFT JOIN clients c ON v.client_id = c.client_id
      LEFT JOIN projects p ON v.project_id = p.id
      WHERE v.user_id = ${user_id} AND v.id = ${valuation_id}
    `;

    if (valuation.length === 0) {
      return res.status(404).json({
        response: false,
        message: 'Wycen nie znaleziono'
      });
    }

    res.status(200).json({
      response: true,
      valuation: valuation[0]
    });

  } catch (error) {
    console.error('Error getting valuation:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas pobierania wyceny'
    });
  }
}

// Create new valuation
export async function createValuation(req, res) {
  try {
    const { 
      user_id, 
      client_id, 
      project_id, 
      title, 
      description, 
      total_amount, 
      total_amount_net, 
      total_amount_gross, 
      currency, 
      settlement_type, 
      contract_type, 
      valid_until, 
      notes 
    } = req.body;

    if (!user_id || !title || !total_amount) {
      return res.status(400).json({
        response: false,
        message: 'user_id, title i total_amount są wymagane'
      });
    }

    const newValuation = await sql`
      INSERT INTO valuations (
        user_id, client_id, project_id, title, description, 
        total_amount, total_amount_net, total_amount_gross, currency, 
        settlement_type, contract_type, valid_until, notes
      )
      VALUES (
        ${user_id}, ${client_id || null}, ${project_id || null}, 
        ${title}, ${description || null}, ${total_amount}, 
        ${total_amount_net || total_amount}, ${total_amount_gross || total_amount}, 
        ${currency || 'PLN'}, ${settlement_type || 'przelew'}, 
        ${contract_type || 'umowa_prywatna'}, ${valid_until || null}, ${notes || null}
      )
      RETURNING *
    `;

    res.status(201).json({
      response: true,
      valuation: newValuation[0],
      message: 'Wycen utworzono pomyślnie'
    });

  } catch (error) {
    console.error('Error creating valuation:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas tworzenia wyceny'
    });
  }
}

// Update valuation
export async function updateValuation(req, res) {
  try {
    const { 
      user_id, 
      valuation_id, 
      client_id, 
      project_id, 
      title, 
      description, 
      total_amount, 
      total_amount_net, 
      total_amount_gross, 
      currency, 
      settlement_type, 
      contract_type, 
      valid_until, 
      notes,
      status
    } = req.body;

    if (!user_id || !valuation_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id i valuation_id są wymagane'
      });
    }

    // Check if valuation exists and belongs to user
    const existingValuation = await sql`
      SELECT id FROM valuations 
      WHERE user_id = ${user_id} AND id = ${valuation_id}
    `;

    if (existingValuation.length === 0) {
      return res.status(404).json({
        response: false,
        message: 'Wycen nie znaleziono'
      });
    }

    // Update valuation
    const updatedValuation = await sql`
      UPDATE valuations 
      SET 
        client_id = ${client_id || null},
        project_id = ${project_id || null},
        title = ${title || null},
        description = ${description || null},
        total_amount = ${total_amount || null},
        total_amount_net = ${total_amount_net || null},
        total_amount_gross = ${total_amount_gross || null},
        currency = ${currency || null},
        settlement_type = ${settlement_type || null},
        contract_type = ${contract_type || null},
        valid_until = ${valid_until || null},
        notes = ${notes || null},
        status = ${status || null},
        sent_at = CASE WHEN ${status} = 'sent' AND sent_at IS NULL THEN NOW() ELSE sent_at END,
        accepted_at = CASE WHEN ${status} = 'active' AND accepted_at IS NULL THEN NOW() ELSE accepted_at END,
        rejected_at = CASE WHEN ${status} = 'cancelled' AND rejected_at IS NULL THEN NOW() ELSE rejected_at END
      WHERE user_id = ${user_id} AND id = ${valuation_id}
      RETURNING *
    `;

    res.status(200).json({
      response: true,
      valuation: updatedValuation[0],
      message: 'Wycen zaktualizowano pomyślnie'
    });

  } catch (error) {
    console.error('Error updating valuation:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas aktualizacji wyceny'
    });
  }
}

// Delete valuation
export async function deleteValuation(req, res) {
  try {
    const { user_id, valuation_id } = req.body;

    if (!user_id || !valuation_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id i valuation_id są wymagane'
      });
    }

    // Check if valuation exists and belongs to user
    const existingValuation = await sql`
      SELECT id FROM valuations 
      WHERE user_id = ${user_id} AND id = ${valuation_id}
    `;

    if (existingValuation.length === 0) {
      return res.status(404).json({
        response: false,
        message: 'Wycen nie znaleziono'
      });
    }

    // Delete valuation
    await sql`
      DELETE FROM valuations 
      WHERE user_id = ${user_id} AND id = ${valuation_id}
    `;

    res.status(200).json({
      response: true,
      message: 'Wycen usunięto pomyślnie'
    });

  } catch (error) {
    console.error('Error deleting valuation:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas usuwania wyceny'
    });
  }
}

// Get valuation statistics
export async function getValuationStats(req, res) {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    const stats = await sql`
      SELECT 
        COUNT(*) as total_valuations,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count,
        COALESCE(SUM(CASE WHEN status = 'active' THEN total_amount ELSE 0 END), 0) as total_accepted_amount,
        COALESCE(SUM(CASE WHEN status = 'sent' THEN total_amount ELSE 0 END), 0) as total_pending_amount
      FROM valuations 
      WHERE user_id = ${user_id}
    `;

    res.status(200).json({
      response: true,
      stats: stats[0]
    });

  } catch (error) {
    console.error('Error getting valuation stats:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas pobierania statystyk wycen'
    });
  }
}
