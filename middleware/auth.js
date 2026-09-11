function normalizeRole(role) {
  return role === 'management' ? 'manager' : role;
}

function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated' });
  const now = Date.now();
  const timeoutMs = (Number(req.session.timeoutMin) || 30) * 60 * 1000;
  if (req.session.lastActivity && now - req.session.lastActivity > timeoutMs) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Session expired' });
  }
  req.session.lastActivity = now;
  req.session.role = normalizeRole(req.session.role);
  next();
}

function allowRoles(roles = []) {
  const allowed = new Set();
  for (const raw of (Array.isArray(roles) ? roles : [roles])) {
    if (raw === 'management') { allowed.add('manager'); allowed.add('admin'); }
    else allowed.add(normalizeRole(raw));
  }
  return (req, res, next) => requireAuth(req, res, () => {
    const role = normalizeRole(req.session.role);
    if (!allowed.has(role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  });
}

const managerOnly = allowRoles(['admin', 'manager']);
const posUsers = allowRoles(['admin', 'manager', 'cashier']);

function sanitizeCosts(value, role) {
  if (normalizeRole(role) !== 'cashier') return value;
  const blocked = new Set(['purchase_price', 'purchasePrice', 'cost_total', 'costTotal', 'profit', 'gross_profit', 'unit_cost']);
  if (Array.isArray(value)) return value.map(v => sanitizeCosts(v, role));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !blocked.has(key))
      .map(([key, child]) => [key, sanitizeCosts(child, role)]));
  }
  return value;
}

module.exports = { requireAuth, allowRoles, managerOnly, posUsers, normalizeRole, sanitizeCosts };
