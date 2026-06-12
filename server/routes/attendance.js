const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/attendance - Mark attendance (bulk)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { date, records } = req.body;
    // records: [{ student_id, status }]

    if (!date || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: 'Date and records array are required' });
    }

    const absentStudents = [];
    const lateStudents = [];

    for (const record of records) {
      await pool.query(
        'INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?) ON CONFLICT(student_id, date) DO UPDATE SET status = excluded.status',
        [record.student_id, date, record.status]
      );

      if (record.status === 'Absent') {
        absentStudents.push(record.student_id);
      } else if (record.status === 'Late') {
        lateStudents.push(record.student_id);
      }
    }

    res.json({ 
      message: 'Attendance marked successfully'
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance/date/:date - Get attendance for a date
router.get('/date/:date', authMiddleware, async (req, res) => {
  try {
    const { class_batch } = req.query;
    let query = `
      SELECT a.*, s.name as student_name, s.roll_number, s.class_batch, s.parent_mobile
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.date = ?
    `;
    const params = [req.params.date];

    if (class_batch) {
      query += ' AND s.class_batch = ?';
      params.push(class_batch);
    }

    query += ' ORDER BY s.name ASC';
    const [records] = await pool.query(query, params);
    res.json(records);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance/student/:id - Student attendance history
router.get('/student/:id', authMiddleware, async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = 'SELECT * FROM attendance WHERE student_id = ?';
    const params = [req.params.id];

    if (month && year) {
      query += ' AND CAST(strftime(\'%m\', date) AS INTEGER) = ? AND CAST(strftime(\'%Y\', date) AS INTEGER) = ?';
      params.push(month, year);
    }

    query += ' ORDER BY date DESC';
    const [records] = await pool.query(query, params);

    // Calculate percentage
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const late = records.filter(r => r.status === 'Late').length;
    const percentage = total > 0 ? ((present + late) / total * 100).toFixed(1) : 0;

    res.json({
      records,
      stats: { total, present, absent, late, percentage }
    });
  } catch (error) {
    console.error('Student attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance/report - Monthly attendance report
router.get('/report', authMiddleware, async (req, res) => {
  try {
    const { month, year, class_batch } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    let query = `
      SELECT s.id, s.name, s.roll_number, s.class_batch,
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_days,
        COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_days,
        COUNT(CASE WHEN a.status = 'Late' THEN 1 END) as late_days,
        COUNT(a.id) as total_days
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND CAST(strftime('%m', a.date) AS INTEGER) = ? AND CAST(strftime('%Y', a.date) AS INTEGER) = ?
      WHERE s.status = 'Active'
    `;
    const params = [currentMonth, currentYear];

    if (class_batch) {
      query += ' AND s.class_batch = ?';
      params.push(class_batch);
    }

    query += ' GROUP BY s.id ORDER BY s.name ASC';
    const [report] = await pool.query(query, params);

    // Add percentage to each record
    const reportWithPercentage = report.map(r => ({
      ...r,
      percentage: r.total_days > 0 ? ((r.present_days + r.late_days) / r.total_days * 100).toFixed(1) : '0.0'
    }));

    res.json(reportWithPercentage);
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
