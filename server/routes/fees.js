const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const MONTHS_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Helper to auto-create monthly fee records carrying forward fee structures
const autoCreateCurrentMonthFees = async () => {
  const now = new Date();
  const currentMonth = MONTHS_ORDER[now.getMonth()];
  const currentYear = now.getFullYear();

  try {
    // Check if fees already exist for this month
    const [existing] = await pool.query('SELECT COUNT(*) as count FROM fees WHERE month = ? AND year = ?', [currentMonth, currentYear]);
    if (existing[0].count > 0) {
      return; // Already created
    }

    // Get all active students
    const [students] = await pool.query("SELECT id FROM students WHERE status = 'Active'");
    if (students.length === 0) return;

    // Find fallback default amount
    let defaultAmount = 2000;
    const [overallRecent] = await pool.query('SELECT amount FROM fees ORDER BY id DESC LIMIT 1');
    if (overallRecent.length > 0) {
      defaultAmount = parseFloat(overallRecent[0].amount);
    }

    const dueDateStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-10`;

    for (const s of students) {
      // Find this student's most recent fee details
      const [lastStudentFee] = await pool.query(
        `SELECT amount, due_date FROM fees 
         WHERE student_id = ? 
         ORDER BY year DESC, 
           CASE month
             WHEN 'December' THEN 12 WHEN 'November' THEN 11 WHEN 'October' THEN 10
             WHEN 'September' THEN 9 WHEN 'August' THEN 8 WHEN 'July' THEN 7
             WHEN 'June' THEN 6 WHEN 'May' THEN 5 WHEN 'April' THEN 4
             WHEN 'March' THEN 3 WHEN 'February' THEN 2 WHEN 'January' THEN 1
           END DESC
         LIMIT 1`,
        [s.id]
      );

      let amount = defaultAmount;
      let due_date = dueDateStr;

      if (lastStudentFee.length > 0) {
        amount = parseFloat(lastStudentFee[0].amount);
        try {
          const lastDue = new Date(lastStudentFee[0].due_date);
          const day = lastDue.getDate() || 10;
          due_date = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } catch (e) {
          due_date = dueDateStr;
        }
      }

      await pool.query(
        "INSERT INTO fees (student_id, month, year, amount, paid_amount, due_date, status) VALUES (?, ?, ?, ?, 0, ?, 'Pending')",
        [s.id, currentMonth, currentYear, amount, due_date]
      );
    }
  } catch (error) {
    console.error('Error in auto-creating fees:', error);
  }
};

router.get('/', authMiddleware, async (req, res) => {
  try {
    await autoCreateCurrentMonthFees();
    const { status, month, year, class_batch } = req.query;
    let query = `SELECT f.*, s.name as student_name, s.roll_number, s.class_batch, s.parent_mobile FROM fees f JOIN students s ON f.student_id = s.id WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND f.status = ?'; params.push(status); }
    if (month) { query += ' AND f.month = ?'; params.push(month); }
    if (year) { query += ' AND f.year = ?'; params.push(year); }
    if (class_batch) { query += ' AND s.class_batch = ?'; params.push(class_batch); }
    query += ' ORDER BY f.due_date DESC, s.name ASC';
    const [fees] = await pool.query(query, params);
    res.json(fees);
  } catch (error) { console.error('Get fees error:', error); res.status(500).json({ message: 'Server error' }); }
});

router.get('/pending', authMiddleware, async (req, res) => {
  try {
    await autoCreateCurrentMonthFees();
    const [fees] = await pool.query(`SELECT f.*, s.name as student_name, s.roll_number, s.class_batch, s.parent_mobile FROM fees f JOIN students s ON f.student_id = s.id WHERE f.status IN ('Pending', 'Overdue') ORDER BY f.due_date ASC`);
    res.json(fees);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/report', authMiddleware, async (req, res) => {
  try {
    await autoCreateCurrentMonthFees();
    const currentYear = req.query.year || new Date().getFullYear();
    const [report] = await pool.query(`SELECT month, year, COUNT(*) as total_entries, SUM(amount) as total_amount, SUM(paid_amount) as collected_amount, SUM(amount - paid_amount) as pending_amount, COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_count, COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count, COUNT(CASE WHEN status = 'Overdue' THEN 1 END) as overdue_count FROM fees WHERE year = ? GROUP BY month, year ORDER BY CASE month WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3 WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6 WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9 WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12 END ASC`, [currentYear]);
    res.json(report);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { student_ids, month, year, amount, due_date } = req.body;
    if (!month || !year || !amount || !due_date) return res.status(400).json({ message: 'Month, year, amount, and due date are required' });
    let targetIds = student_ids;
    if (!targetIds || targetIds.length === 0) {
      const [students] = await pool.query("SELECT id FROM students WHERE status = 'Active'");
      targetIds = students.map(s => s.id);
    }
    let created = 0, skipped = 0;
    for (const sid of targetIds) {
      const [existing] = await pool.query('SELECT id FROM fees WHERE student_id = ? AND month = ? AND year = ?', [sid, month, year]);
      if (existing.length === 0) { await pool.query('INSERT INTO fees (student_id, month, year, amount, due_date) VALUES (?, ?, ?, ?, ?)', [sid, month, year, amount, due_date]); created++; } else { skipped++; }
    }
    res.status(201).json({ message: `Created: ${created}, Skipped: ${skipped}`, created, skipped });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { paid_amount, payment_mode, status } = req.body;
    const [existing] = await pool.query('SELECT * FROM fees WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Fee record not found' });
    const newPaid = paid_amount !== undefined ? paid_amount : existing[0].paid_amount;
    const newStatus = status || (newPaid >= existing[0].amount ? 'Paid' : 'Pending');
    const paidDate = newStatus === 'Paid' ? new Date().toISOString().split('T')[0] : null;
    await pool.query('UPDATE fees SET paid_amount = ?, payment_mode = ?, status = ?, paid_date = ? WHERE id = ?', [newPaid, payment_mode || existing[0].payment_mode, newStatus, paidDate, req.params.id]);
    const [updated] = await pool.query('SELECT f.*, s.name as student_name, s.roll_number, s.class_batch, s.parent_mobile FROM fees f JOIN students s ON f.student_id = s.id WHERE f.id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/remind', authMiddleware, async (req, res) => {
  try {
    const { fee_ids } = req.body;
    let query = `SELECT f.*, s.name as student_name, s.parent_mobile, s.id as sid FROM fees f JOIN students s ON f.student_id = s.id WHERE f.status IN ('Pending', 'Overdue')`;
    const params = [];
    if (fee_ids && fee_ids.length > 0) { query += ' AND f.id IN (?)'; params.push(fee_ids); }
    const [pendingFees] = await pool.query(query, params);
    res.json(pendingFees);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
