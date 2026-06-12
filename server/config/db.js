const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
require('dotenv').config();

let db;

const pool = {
  query: async (sql, params = []) => {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const upperSql = sql.trim().toUpperCase();
    if (upperSql.startsWith('SELECT') || upperSql.startsWith('WITH') || upperSql.startsWith('PRAGMA')) {
      const rows = await db.all(sql, params);
      return [rows]; // Emulate mysql2
    } else {
      const result = await db.run(sql, params);
      return [{ insertId: result.lastID, affectedRows: result.changes }]; // Emulate mysql2 result object
    }
  }
};

// Create database and tables automatically
async function initializeDatabase() {
  db = await open({
    filename: path.join(__dirname, '../database.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA journal_mode = WAL;');
  await db.exec('PRAGMA foreign_keys = ON;');

  // Create admins table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create students table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roll_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      class_batch TEXT NOT NULL,
      parent_name TEXT NOT NULL,
      parent_mobile TEXT NOT NULL,
      address TEXT,
      admission_date DATE NOT NULL,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create attendance table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      date DATE NOT NULL,
      status TEXT NOT NULL,
      marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE (student_id, date)
    )
  `);

  // Create subjects table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      class_batch TEXT,
      exam_date DATE,
      max_marks INTEGER DEFAULT 100,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create fees table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      paid_amount DECIMAL(10,2) DEFAULT 0,
      due_date DATE NOT NULL,
      paid_date DATE,
      status TEXT DEFAULT 'Pending',
      payment_mode TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  // Create subject_marks table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS subject_marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      marks_obtained DECIMAL(5,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE (subject_id, student_id)
    )
  `);

  // Create notifications table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      recipient_number TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
    )
  `);

  // Create default admin if not exists
  const bcrypt = require('bcryptjs');
  const admins = await db.all('SELECT * FROM admins WHERE email = ?', [process.env.ADMIN_EMAIL || 'nixtion@gmail.com']);
  if (admins.length === 0) {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'nixtion@123', 10);
    await db.run(
      'INSERT INTO admins (name, email, password) VALUES (?, ?, ?)',
      [process.env.ADMIN_NAME || 'Nixtion Admin', process.env.ADMIN_EMAIL || 'nixtion@gmail.com', hashedPassword]
    );
    console.log('✅ Default admin account created');
  }

  console.log('✅ Database initialized successfully with SQLite');
}

module.exports = { pool, initializeDatabase };
