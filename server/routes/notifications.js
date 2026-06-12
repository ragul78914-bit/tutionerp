const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/notifications/log - Log that a manual communication was triggered
router.post('/log', authMiddleware, async (req, res) => {
  try {
    const { student_id, type, message, category, recipient_number } = req.body;
    
    await pool.query(
      'INSERT INTO notifications (student_id, type, category, message, recipient_number, status) VALUES (?, ?, ?, ?, ?, ?)',
      [student_id || null, type, category || 'General', message, recipient_number, 'Sent']
    );

    res.json({ message: 'Communication logged' });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/notifications/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { category, type, limit } = req.query;
    let query = `SELECT n.*, s.name as student_name FROM notifications n LEFT JOIN students s ON n.student_id = s.id WHERE 1=1`;
    const params = [];
    if (category) { query += ' AND n.category = ?'; params.push(category); }
    if (type) { query += ' AND n.type = ?'; params.push(type); }
    query += ' ORDER BY n.sent_at DESC';
    if (limit) { query += ' LIMIT ?'; params.push(parseInt(limit)); }
    else { query += ' LIMIT 100'; }
    const [notifications] = await pool.query(query, params);
    res.json(notifications);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
