const roleHierarchy = { ADMIN: 3, SUPER_USER: 2, USER: 1 };

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Hak akses tidak mencukupi.' });
    }
    next();
  };
}

function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const userLevel = roleHierarchy[req.user.role] || 0;
    const minLevel = roleHierarchy[minRole] || 0;
    if (userLevel < minLevel) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Hak akses tidak mencukupi.' });
    }
    next();
  };
}

module.exports = { requireRole, requireMinRole };
