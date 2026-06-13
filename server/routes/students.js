const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Generate unique roll number
async function generateRollNumber(classBatch) {
  const prefix = classBatch.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
  const [result] = await pool.query(
    'SELECT roll_number FROM students WHERE roll_number LIKE ? ORDER BY id DESC LIMIT 1',
    [`${prefix}%`]
  );
  
  let nextNum = 1;
  if (result.length > 0) {
    const lastNum = parseInt(result[0].roll_number.replace(prefix, '')) || 0;
    nextNum = lastNum + 1;
  }
  
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// GET /api/students - List all students
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, class_batch, status, gender } = req.query;
    let query = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR roll_number LIKE ? OR parent_name LIKE ? OR parent_mobile LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    if (class_batch) {
      query += ' AND class_batch = ?';
      params.push(class_batch);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (gender) {
      query += ' AND gender = ?';
      params.push(gender);
    }

    query += ' ORDER BY name ASC';
    const [students] = await pool.query(query, params);
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/students/stats - Student statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [total] = await pool.query('SELECT COUNT(*) as count FROM students WHERE status = "Active"');
    const [boys] = await pool.query('SELECT COUNT(*) as count FROM students WHERE gender = "Boy" AND status = "Active"');
    const [girls] = await pool.query('SELECT COUNT(*) as count FROM students WHERE gender = "Girl" AND status = "Active"');
    const [classes] = await pool.query('SELECT DISTINCT class_batch FROM students WHERE status = "Active" ORDER BY class_batch');
    
    res.json({
      total: total[0].count,
      boys: boys[0].count,
      girls: girls[0].count,
      classes: classes.map(c => c.class_batch)
    });
  } catch (error) {
    console.error('Student stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/students/:id - Get student details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [students] = await pool.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (students.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(students[0]);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/students/:id/profile - Get complete structured student profile
router.get('/:id/profile', authMiddleware, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);

    // 1. Student details
    const [students] = await pool.query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (students.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const student = students[0];

    // 2. Attendance history & stats
    const [attendance] = await pool.query('SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC', [studentId]);
    const totalAttendance = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'Present').length;
    const absentCount = attendance.filter(a => a.status === 'Absent').length;
    const lateCount = attendance.filter(a => a.status === 'Late').length;
    const attendancePercentage = totalAttendance > 0 
      ? Math.round(((presentCount + lateCount) / totalAttendance) * 100)
      : 100;

    // 3. Fee history & pending
    const [fees] = await pool.query(`SELECT * FROM fees WHERE student_id = ? ORDER BY year DESC, CASE month WHEN 'December' THEN 12 WHEN 'November' THEN 11 WHEN 'October' THEN 10 WHEN 'September' THEN 9 WHEN 'August' THEN 8 WHEN 'July' THEN 7 WHEN 'June' THEN 6 WHEN 'May' THEN 5 WHEN 'April' THEN 4 WHEN 'March' THEN 3 WHEN 'February' THEN 2 WHEN 'January' THEN 1 ELSE 0 END DESC`, [studentId]);
    const totalFeesPaid = fees.reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0);
    const totalFeesPending = fees.reduce((sum, f) => sum + (parseFloat(f.amount) - parseFloat(f.paid_amount || 0)), 0);

    // 4. Subject-wise marks
    const [marks] = await pool.query(`
      SELECT sm.*, sub.name as subject_name, sub.exam_date, sub.max_marks, sub.description
      FROM subject_marks sm
      JOIN subjects sub ON sm.subject_id = sub.id
      WHERE sm.student_id = ?
      ORDER BY sub.exam_date DESC, sub.name ASC
    `, [studentId]);

    const formattedMarks = marks.map(m => {
      const pct = (parseFloat(m.marks_obtained) / parseFloat(m.max_marks)) * 100;
      return {
        ...m,
        percentage: pct.toFixed(1),
        grade: pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : pct >= 35 ? 'E' : 'F',
        status: pct >= 35 ? 'PASS' : 'FAIL'
      };
    });

    const overallObtained = marks.reduce((sum, m) => sum + parseFloat(m.marks_obtained), 0);
    const overallMax = marks.reduce((sum, m) => sum + parseFloat(m.max_marks), 0);
    const overallPercentage = overallMax > 0 ? ((overallObtained / overallMax) * 100).toFixed(1) : '0.0';
    const overallStatus = overallPercentage >= 35 ? 'PASS' : 'FAIL';

    // 5. Rank calculation
    const [classStudents] = await pool.query('SELECT id FROM students WHERE class_batch = ? AND status = "Active"', [student.class_batch]);
    const studentScores = [];
    for (const cs of classStudents) {
      const [csMarks] = await pool.query(`
        SELECT SUM(sm.marks_obtained) as obtained, SUM(sub.max_marks) as max_marks
        FROM subject_marks sm
        JOIN subjects sub ON sm.subject_id = sub.id
        WHERE sm.student_id = ?
      `, [cs.id]);
      const CSObtained = parseFloat(csMarks[0].obtained) || 0;
      const CSMax = parseFloat(csMarks[0].max_marks) || 0;
      const pct = CSMax > 0 ? (CSObtained / CSMax) * 100 : 0;
      studentScores.push({ id: cs.id, percentage: pct });
    }
    studentScores.sort((a, b) => b.percentage - a.percentage);
    const rankIndex = studentScores.findIndex(s => s.id === studentId);
    const rank = rankIndex !== -1 ? rankIndex + 1 : '-';

    // 6. Monthly performance trend
    const [monthlyTrend] = await pool.query(`
      SELECT CAST(strftime('%m', sub.exam_date) AS INTEGER) as month_num, CAST(strftime('%Y', sub.exam_date) AS INTEGER) as year,
             AVG((sm.marks_obtained * 1.0 / sub.max_marks) * 100) as avg_percentage
      FROM subject_marks sm
      JOIN subjects sub ON sm.subject_id = sub.id
      WHERE sm.student_id = ?
      GROUP BY strftime('%Y', sub.exam_date), strftime('%m', sub.exam_date)
      ORDER BY strftime('%Y', sub.exam_date) ASC, strftime('%m', sub.exam_date) ASC
    `, [studentId]);

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const formattedTrend = monthlyTrend.map(t => ({
      month: `${monthNames[t.month_num - 1].substring(0, 3)} ${t.year}`,
      percentage: parseFloat(t.avg_percentage).toFixed(1)
    }));

    res.json({
      student,
      attendance: {
        history: attendance,
        stats: {
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          percentage: attendancePercentage
        }
      },
      fees: {
        history: fees,
        paid: totalFeesPaid,
        pending: totalFeesPending
      },
      marks: formattedMarks,
      performance: {
        overallObtained,
        overallMax,
        overallPercentage,
        overallStatus,
        rank,
        monthlyTrend: formattedTrend
      }
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/students - Add new student
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, gender, class_batch, parent_name, parent_mobile, address, admission_date } = req.body;

    if (!name || !gender || !class_batch || !parent_name || !parent_mobile || !admission_date) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const roll_number = await generateRollNumber(class_batch);

    const [result] = await pool.query(
      'INSERT INTO students (roll_number, name, gender, class_batch, parent_name, parent_mobile, address, admission_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [roll_number, name, gender, class_batch, parent_name, parent_mobile, address || '', admission_date]
    );

    const [newStudent] = await pool.query('SELECT * FROM students WHERE id = ?', [result.insertId]);
    res.status(201).json(newStudent[0]);
  } catch (error) {
    console.error('Add student error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Duplicate roll number. Please try again.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/students/:id - Update student
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, gender, class_batch, parent_name, parent_mobile, address, admission_date, status } = req.body;
    
    const [existing] = await pool.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await pool.query(
      'UPDATE students SET name = ?, gender = ?, class_batch = ?, parent_name = ?, parent_mobile = ?, address = ?, admission_date = ?, status = ? WHERE id = ?',
      [
        name || existing[0].name,
        gender || existing[0].gender,
        class_batch || existing[0].class_batch,
        parent_name || existing[0].parent_name,
        parent_mobile || existing[0].parent_mobile,
        address !== undefined ? address : existing[0].address,
        admission_date || existing[0].admission_date,
        status || existing[0].status,
        req.params.id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/students/:id - Delete student
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await pool.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
