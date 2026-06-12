const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [totalStudents] = await pool.query('SELECT COUNT(*) as count FROM students WHERE status = "Active"');
    const [boys] = await pool.query('SELECT COUNT(*) as count FROM students WHERE gender = "Boy" AND status = "Active"');
    const [girls] = await pool.query('SELECT COUNT(*) as count FROM students WHERE gender = "Girl" AND status = "Active"');
    const [presentToday] = await pool.query('SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = "Present"', [today]);
    const [absentToday] = await pool.query('SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = "Absent"', [today]);
    const [lateToday] = await pool.query('SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = "Late"', [today]);
    const [totalAttendanceToday] = await pool.query('SELECT COUNT(*) as count FROM attendance WHERE date = ?', [today]);

    const attendancePercentage = totalAttendanceToday[0].count > 0
      ? (((presentToday[0].count + lateToday[0].count) / totalAttendanceToday[0].count) * 100).toFixed(1) : 0;

    const [pendingFees] = await pool.query('SELECT COUNT(*) as count, COALESCE(SUM(amount - paid_amount), 0) as total FROM fees WHERE status IN ("Pending", "Overdue")');
    const [monthlyCollection] = await pool.query('SELECT COALESCE(SUM(paid_amount), 0) as total FROM fees WHERE CAST(strftime(\'%m\', paid_date) AS INTEGER) = ? AND CAST(strftime(\'%Y\', paid_date) AS INTEGER) = ? AND status = "Paid"', [currentMonth, currentYear]);

    const [upcomingTests] = await pool.query('SELECT id, name, class_batch, exam_date as date FROM subjects WHERE exam_date >= ? ORDER BY exam_date ASC LIMIT 5', [today]);
    const [recentNotifications] = await pool.query('SELECT n.*, s.name as student_name FROM notifications n LEFT JOIN students s ON n.student_id = s.id ORDER BY n.sent_at DESC LIMIT 10');

    // Monthly attendance trend (last 6 months)
    const [attendanceTrend] = await pool.query(`
      SELECT CAST(strftime('%m', date) AS INTEGER) as month, CAST(strftime('%Y', date) AS INTEGER) as year,
        COUNT(CASE WHEN status = 'Present' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent,
        COUNT(*) as total
      FROM attendance
      WHERE date >= date('now', '-6 months')
      GROUP BY strftime('%Y', date), strftime('%m', date)
      ORDER BY year, month
    `);

    res.json({
      totalStudents: totalStudents[0].count,
      boys: boys[0].count,
      girls: girls[0].count,
      presentToday: presentToday[0].count,
      absentToday: absentToday[0].count,
      lateToday: lateToday[0].count,
      attendancePercentage: parseFloat(attendancePercentage),
      pendingFeesCount: pendingFees[0].count,
      pendingFeesAmount: pendingFees[0].total,
      monthlyCollection: monthlyCollection[0].total,
      upcomingTests,
      recentNotifications,
      attendanceTrend
    });
  } catch (error) { console.error('Dashboard error:', error); res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
