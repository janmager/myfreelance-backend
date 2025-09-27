import { sql } from '../config/db.js';

export async function getLimits(req, res) {
  try {
    const limits = await sql`
      SELECT * FROM limits ORDER BY name
    `;
    
    res.status(200).json({
      response: true,
      limits: limits
    });
  } catch (error) {
    console.error('Error fetching limits:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas pobierania limitów'
    });
  }
}

export async function getUserUsage(req, res) {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    // Get user's premium level (default to 0 if not set)
    const user = await sql`
      SELECT premium_level FROM users WHERE user_id = ${user_id}
    `;
    
    const premiumLevel = user.length > 0 ? (user[0].premium_level || 0) : 0;

    // Get limits for user's premium level
    const limits = await sql`
      SELECT * FROM limits ORDER BY name
    `;

    // Get actual usage counts
    const [clientsCount, projectsCount, notesCount, contractsCount, filesCount, linksCount, tasksCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM clients WHERE user_id = ${user_id}`,
      sql`SELECT COUNT(*) as count FROM projects WHERE user_id = ${user_id}`,
      sql`SELECT COUNT(*) as count FROM notes WHERE user_id = ${user_id}`,
      sql`SELECT COUNT(*) as count FROM contracts WHERE user_id = ${user_id}`,
      sql`SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size FROM files WHERE user_id = ${user_id}`,
      sql`SELECT COUNT(*) as count FROM links WHERE user_id = ${user_id}`,
      sql`SELECT COUNT(*) as count FROM tasks WHERE user_id = ${user_id}`
    ]);

    // Get active counts
    const [activeClients, activeProjects, activeContracts, completedProjects, completedTasks, pendingTasks] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM clients WHERE user_id = ${user_id} AND status = 'active'`,
      sql`SELECT COUNT(*) as count FROM projects WHERE user_id = ${user_id} AND status = 'active'`,
      sql`SELECT COUNT(*) as count FROM contracts WHERE user_id = ${user_id} AND status = 'active'`,
      sql`SELECT COUNT(*) as count FROM projects WHERE user_id = ${user_id} AND status = 'completed'`,
      sql`SELECT COUNT(*) as count FROM tasks WHERE user_id = ${user_id} AND status = 'done'`,
      sql`SELECT COUNT(*) as count FROM tasks WHERE user_id = ${user_id} AND status IN ('todo', 'in_progress')`
    ]);

    // Helper function to get limit for premium level
    const getLimit = (name) => {
      const limit = limits.find(l => l.name === name);
      if (!limit) return 0;
      switch (premiumLevel) {
        case 0: return limit.premium_level_0;
        case 1: return limit.premium_level_1;
        case 2: return limit.premium_level_2;
        default: return limit.premium_level_0;
      }
    };

    // Format file size from bytes to MB
    const fileSizeMB = filesCount[0]?.total_size ? filesCount[0].total_size / (1024 * 1024) : 0;

    const stats = {
      clients: {
        total: parseInt(clientsCount[0]?.count || 0),
        active: parseInt(activeClients[0]?.count || 0),
        used: parseInt(clientsCount[0]?.count || 0),
        limit: getLimit('clients')
      },
      projects: {
        total: parseInt(projectsCount[0]?.count || 0),
        active: parseInt(activeProjects[0]?.count || 0),
        completed: parseInt(completedProjects[0]?.count || 0),
        used: parseInt(projectsCount[0]?.count || 0),
        limit: getLimit('projects')
      },
      notes: {
        total: parseInt(notesCount[0]?.count || 0),
        used: parseInt(notesCount[0]?.count || 0),
        limit: getLimit('notes')
      },
      contracts: {
        total: parseInt(contractsCount[0]?.count || 0),
        active: parseInt(activeContracts[0]?.count || 0),
        used: parseInt(contractsCount[0]?.count || 0),
        limit: getLimit('contracts')
      },
      files: {
        total: parseInt(filesCount[0]?.count || 0),
        totalSize: fileSizeMB,
        used: fileSizeMB,
        limit: getLimit('files_mb')
      },
      links: {
        total: parseInt(linksCount[0]?.count || 0),
        used: parseInt(linksCount[0]?.count || 0),
        limit: getLimit('links')
      },
      tasks: {
        total: parseInt(tasksCount[0]?.count || 0),
        completed: parseInt(completedTasks[0]?.count || 0),
        pending: parseInt(pendingTasks[0]?.count || 0),
        used: parseInt(tasksCount[0]?.count || 0),
        limit: getLimit('tasks')
      }
    };

    res.status(200).json({
      response: true,
      stats: stats,
      premium_level: premiumLevel
    });
  } catch (error) {
    console.error('Error fetching user usage:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas pobierania statystyk wykorzystania'
    });
  }
}

export async function checkClientLimit(req, res) {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    // Get user's premium level (default to 0 if not set)
    const user = await sql`
      SELECT premium_level FROM users WHERE user_id = ${user_id}
    `;
    
    const premiumLevel = user.length > 0 ? (user[0].premium_level || 0) : 0;

    // Get clients limit for user's premium level
    const clientsLimit = await sql`
      SELECT premium_level_0, premium_level_1, premium_level_2 
      FROM limits 
      WHERE name = 'clients'
    `;

    if (clientsLimit.length === 0) {
      return res.status(500).json({
        response: false,
        message: 'Limit klientów nie został znaleziony'
      });
    }

    // Get current clients count
    const clientsCount = await sql`
      SELECT COUNT(*) as count FROM clients WHERE user_id = ${user_id}
    `;

    const currentCount = parseInt(clientsCount[0]?.count || 0);
    
    // Get limit based on premium level
    let limit;
    switch (premiumLevel) {
      case 0: limit = clientsLimit[0].premium_level_0; break;
      case 1: limit = clientsLimit[0].premium_level_1; break;
      case 2: limit = clientsLimit[0].premium_level_2; break;
      default: limit = clientsLimit[0].premium_level_0;
    }

    const canAdd = currentCount < limit;

    res.status(200).json({
      response: true,
      can_add: canAdd,
      current_count: currentCount,
      limit: limit,
      premium_level: premiumLevel
    });
  } catch (error) {
    console.error('Error checking client limit:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas sprawdzania limitu klientów'
    });
  }
}

export async function checkProjectLimit(req, res) {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    // Get user's premium level (default to 0 if not set)
    const user = await sql`
      SELECT premium_level FROM users WHERE user_id = ${user_id}
    `;
    
    const premiumLevel = user.length > 0 ? (user[0].premium_level || 0) : 0;

    // Get projects limit for user's premium level
    const projectsLimit = await sql`
      SELECT premium_level_0, premium_level_1, premium_level_2 
      FROM limits 
      WHERE name = 'projects'
    `;

    if (projectsLimit.length === 0) {
      return res.status(500).json({
        response: false,
        message: 'Limit projektów nie został znaleziony'
      });
    }

    // Get current projects count
    const projectsCount = await sql`
      SELECT COUNT(*) as count FROM projects WHERE user_id = ${user_id}
    `;

    const currentCount = parseInt(projectsCount[0]?.count || 0);
    
    // Get limit based on premium level
    let limit;
    switch (premiumLevel) {
      case 0: limit = projectsLimit[0].premium_level_0; break;
      case 1: limit = projectsLimit[0].premium_level_1; break;
      case 2: limit = projectsLimit[0].premium_level_2; break;
      default: limit = projectsLimit[0].premium_level_0;
    }

    const canAdd = currentCount < limit;

    res.status(200).json({
      response: true,
      can_add: canAdd,
      current_count: currentCount,
      limit: limit,
      premium_level: premiumLevel
    });
  } catch (error) {
    console.error('Error checking project limit:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas sprawdzania limitu projektów'
    });
  }
}

export async function checkNoteLimit(req, res) {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    // Get user's premium level (default to 0 if not set)
    const user = await sql`
      SELECT premium_level FROM users WHERE user_id = ${user_id}
    `;
    
    const premiumLevel = user.length > 0 ? (user[0].premium_level || 0) : 0;

    // Get notes limit for user's premium level
    const notesLimit = await sql`
      SELECT premium_level_0, premium_level_1, premium_level_2 
      FROM limits 
      WHERE name = 'notes'
    `;

    if (notesLimit.length === 0) {
      return res.status(500).json({
        response: false,
        message: 'Limit notatek nie został znaleziony'
      });
    }

    // Get current notes count
    const notesCount = await sql`
      SELECT COUNT(*) as count FROM notes WHERE user_id = ${user_id}
    `;

    const currentCount = parseInt(notesCount[0]?.count || 0);
    
    // Get limit based on premium level
    let limit;
    switch (premiumLevel) {
      case 0: limit = notesLimit[0].premium_level_0; break;
      case 1: limit = notesLimit[0].premium_level_1; break;
      case 2: limit = notesLimit[0].premium_level_2; break;
      default: limit = notesLimit[0].premium_level_0;
    }

    const canAdd = currentCount < limit;

    res.status(200).json({
      response: true,
      can_add: canAdd,
      current_count: currentCount,
      limit: limit,
      premium_level: premiumLevel
    });
  } catch (error) {
    console.error('Error checking note limit:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas sprawdzania limitu notatek'
    });
  }
}

export async function checkContractLimit(req, res) {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    // Get user's premium level (default to 0 if not set)
    const user = await sql`
      SELECT premium_level FROM users WHERE user_id = ${user_id}
    `;
    
    const premiumLevel = user.length > 0 ? (user[0].premium_level || 0) : 0;

    // Get contracts limit for user's premium level
    const contractsLimit = await sql`
      SELECT premium_level_0, premium_level_1, premium_level_2 
      FROM limits 
      WHERE name = 'contracts'
    `;

    if (contractsLimit.length === 0) {
      return res.status(500).json({
        response: false,
        message: 'Limit kontraktów nie został znaleziony'
      });
    }

    // Get current contracts count
    const contractsCount = await sql`
      SELECT COUNT(*) as count FROM contracts WHERE user_id = ${user_id}
    `;

    const currentCount = parseInt(contractsCount[0]?.count || 0);
    
    // Get limit based on premium level
    let limit;
    switch (premiumLevel) {
      case 0: limit = contractsLimit[0].premium_level_0; break;
      case 1: limit = contractsLimit[0].premium_level_1; break;
      case 2: limit = contractsLimit[0].premium_level_2; break;
      default: limit = contractsLimit[0].premium_level_0;
    }

    const canAdd = currentCount < limit;

    res.status(200).json({
      response: true,
      can_add: canAdd,
      current_count: currentCount,
      limit: limit,
      premium_level: premiumLevel
    });
  } catch (error) {
    console.error('Error checking contract limit:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas sprawdzania limitu kontraktów'
    });
  }
}

export async function checkFileSizeLimit(req, res) {
  try {
    const { user_id, file_size } = req.body;
    
    if (!user_id || file_size === undefined) {
      return res.status(400).json({
        response: false,
        message: 'user_id i file_size są wymagane'
      });
    }

    // Get user's premium level (default to 0 if not set)
    const user = await sql`
      SELECT premium_level FROM users WHERE user_id = ${user_id}
    `;
    
    const premiumLevel = user.length > 0 ? (user[0].premium_level || 0) : 0;

    // Get file size limit for user's premium level (in MB)
    const filesLimit = await sql`
      SELECT premium_level_0, premium_level_1, premium_level_2 
      FROM limits 
      WHERE name = 'files_mb'
    `;

    if (filesLimit.length === 0) {
      return res.status(500).json({
        response: false,
        message: 'Limit plików (files_mb) nie został znaleziony'
      });
    }

    // Get current total file size in MB
    const filesSize = await sql`
      SELECT COALESCE(SUM(file_size), 0) as total_size FROM files WHERE user_id = ${user_id}
    `;

    const currentSizeMB = Math.round((parseInt(filesSize[0]?.total_size || 0) / (1024 * 1024)) * 100) / 100;
    const newFileSizeMB = Math.round((file_size / (1024 * 1024)) * 100) / 100;
    
    // Get limit based on premium level (in MB)
    let limitMB;
    switch (premiumLevel) {
      case 0: limitMB = filesLimit[0].premium_level_0; break;
      case 1: limitMB = filesLimit[0].premium_level_1; break;
      case 2: limitMB = filesLimit[0].premium_level_2; break;
      default: limitMB = filesLimit[0].premium_level_0;
    }

    const wouldExceedLimit = (currentSizeMB + newFileSizeMB) > limitMB;

    res.status(200).json({
      response: true,
      can_upload: !wouldExceedLimit,
      current_size_mb: currentSizeMB,
      new_file_size_mb: newFileSizeMB,
      total_after_upload_mb: currentSizeMB + newFileSizeMB,
      limit_mb: limitMB,
      premium_level: premiumLevel
    });
  } catch (error) {
    console.error('Error checking file size limit:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas sprawdzania limitu rozmiaru plików'
    });
  }
}

export async function checkLinkLimit(req, res) {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    // Get user's premium level (default to 0 if not set)
    const user = await sql`
      SELECT premium_level FROM users WHERE user_id = ${user_id}
    `;
    
    const premiumLevel = user.length > 0 ? (user[0].premium_level || 0) : 0;

    // Get links limit for user's premium level
    const linksLimit = await sql`
      SELECT premium_level_0, premium_level_1, premium_level_2 
      FROM limits 
      WHERE name = 'links'
    `;

    if (linksLimit.length === 0) {
      return res.status(500).json({
        response: false,
        message: 'Limit linków nie został znaleziony'
      });
    }

    // Get current links count
    const linksCount = await sql`
      SELECT COUNT(*) as count FROM links WHERE user_id = ${user_id}
    `;

    const currentCount = parseInt(linksCount[0]?.count || 0);
    
    // Get limit based on premium level
    let limit;
    switch (premiumLevel) {
      case 0: limit = linksLimit[0].premium_level_0; break;
      case 1: limit = linksLimit[0].premium_level_1; break;
      case 2: limit = linksLimit[0].premium_level_2; break;
      default: limit = linksLimit[0].premium_level_0;
    }

    const canAdd = currentCount < limit;

    res.status(200).json({
      response: true,
      can_add: canAdd,
      current_count: currentCount,
      limit: limit,
      premium_level: premiumLevel
    });
  } catch (error) {
    console.error('Error checking link limit:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas sprawdzania limitu linków'
    });
  }
}

export async function checkTaskLimit(req, res) {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    // Get user's premium level (default to 0 if not set)
    const user = await sql`
      SELECT premium_level FROM users WHERE user_id = ${user_id}
    `;
    
    const premiumLevel = user.length > 0 ? (user[0].premium_level || 0) : 0;

    // Get tasks limit for user's premium level
    const tasksLimit = await sql`
      SELECT premium_level_0, premium_level_1, premium_level_2 
      FROM limits 
      WHERE name = 'tasks'
    `;

    if (tasksLimit.length === 0) {
      return res.status(500).json({
        response: false,
        message: 'Limit zadań nie został znaleziony'
      });
    }

    // Get current tasks count
    const tasksCount = await sql`
      SELECT COUNT(*) as count FROM tasks WHERE user_id = ${user_id}
    `;

    const currentCount = parseInt(tasksCount[0]?.count || 0);
    
    // Get limit based on premium level
    let limit;
    switch (premiumLevel) {
      case 0: limit = tasksLimit[0].premium_level_0; break;
      case 1: limit = tasksLimit[0].premium_level_1; break;
      case 2: limit = tasksLimit[0].premium_level_2; break;
      default: limit = tasksLimit[0].premium_level_0;
    }

    const canAdd = currentCount < limit;

    res.status(200).json({
      response: true,
      can_add: canAdd,
      current_count: currentCount,
      limit: limit,
      premium_level: premiumLevel
    });
  } catch (error) {
    console.error('Error checking task limit:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas sprawdzania limitu zadań'
    });
  }
}
