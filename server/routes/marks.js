const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/marks/subjects
router.get('/subjects', authMiddleware, async (req, res) => {
  try {
    const [subjects] = await pool.query('SELECT * FROM subjects ORDER BY exam_date DESC, name');
    res.json(subjects);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/marks/subjects
router.post('/subjects', authMiddleware, async (req, res) => {
  try {
    const { name, class_batch, exam_date, max_marks, description } = req.body;
    if (!name || !class_batch || !exam_date || !max_marks) {
      return res.status(400).json({ message: 'Name, class/batch, exam date, and max marks are required' });
    }
    const [result] = await pool.query(
      'INSERT INTO subjects (name, class_batch, exam_date, max_marks, description) VALUES (?, ?, ?, ?, ?)',
      [name, class_batch, exam_date, max_marks, description || null]
    );
    const [subject] = await pool.query('SELECT * FROM subjects WHERE id = ?', [result.insertId]);
    res.status(201).json(subject[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

// PUT /api/marks/subjects/:id
router.put('/subjects/:id', authMiddleware, async (req, res) => {
  try {
    const { name, class_batch, exam_date, max_marks, description } = req.body;
    if (!name || !class_batch || !exam_date || !max_marks) {
      return res.status(400).json({ message: 'Name, class/batch, exam date, and max marks are required' });
    }
    await pool.query(
      'UPDATE subjects SET name = ?, class_batch = ?, exam_date = ?, max_marks = ?, description = ? WHERE id = ?',
      [name, class_batch, exam_date, max_marks, description || null, req.params.id]
    );
    const [subject] = await pool.query('SELECT * FROM subjects WHERE id = ?', [req.params.id]);
    res.json(subject[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

// DELETE /api/marks/subjects/:id
router.delete('/subjects/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Subject deleted' });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/marks - Enter marks (bulk)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { subject_id, marks } = req.body;
    // marks: [{ student_id, marks_obtained }]
    if (!subject_id || !marks || !Array.isArray(marks)) {
      return res.status(400).json({ message: 'Subject ID and marks array required' });
    }

    for (const m of marks) {
      await pool.query(
        'INSERT INTO subject_marks (subject_id, student_id, marks_obtained) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE marks_obtained = ?',
        [subject_id, m.student_id, m.marks_obtained, m.marks_obtained]
      );
    }

    res.json({ message: `Marks entered successfully for ${marks.length} entries` });
  } catch (error) { console.error('Enter marks error:', error); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/marks/subject/:subjectId - Get subject results with rankings
router.get('/subject/:subjectId', authMiddleware, async (req, res) => {
  try {
    const [subject] = await pool.query('SELECT * FROM subjects WHERE id = ?', [req.params.subjectId]);
    if (subject.length === 0) return res.status(404).json({ message: 'Subject not found' });

    const [results] = await pool.query(`
      SELECT sm.*, s.name as student_name, s.roll_number, sub.name as subject_name, sub.max_marks
      FROM subject_marks sm
      JOIN students s ON sm.student_id = s.id
      JOIN subjects sub ON sm.subject_id = sub.id
      WHERE sm.subject_id = ?
      ORDER BY s.name ASC
    `, [req.params.subjectId]);

    const formattedResults = results.map(r => {
      const percentage = ((parseFloat(r.marks_obtained) / parseFloat(r.max_marks)) * 100);
      const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : percentage >= 35 ? 'E' : 'F';
      const status = percentage >= 35 ? 'Pass' : 'Fail';
      return {
        ...r,
        percentage: percentage.toFixed(1),
        grade,
        status
      };
    });

    const rankings = [...formattedResults]
      .sort((a, b) => b.marks_obtained - a.marks_obtained)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    res.json({ subject: subject[0], results: formattedResults, rankings });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

// DELETE /api/marks/subject/:subjectId/student/:studentId
router.delete('/subject/:subjectId/student/:studentId', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM subject_marks WHERE subject_id = ? AND student_id = ?', [req.params.subjectId, req.params.studentId]);
    res.json({ message: 'Mark deleted successfully' });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/marks/student/:id - Student marks history
router.get('/student/:id', authMiddleware, async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT sm.*, sub.name as subject_name, sub.exam_date, sub.max_marks, sub.description
      FROM subject_marks sm
      JOIN subjects sub ON sm.subject_id = sub.id
      WHERE sm.student_id = ?
      ORDER BY sub.exam_date DESC, sub.name
    `, [req.params.id]);
    res.json(results);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
