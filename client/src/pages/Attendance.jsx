import { useState, useEffect } from 'react';
import api from '../services/api';
import { sendWhatsApp, sendSMS, templates } from '../utils/communication';

export default function Attendance() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [classBatch, setClassBatch] = useState('');
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [absentees, setAbsentees] = useState([]);

  useEffect(() => {
    api.getStudentStats().then(s => setClasses(s.classes || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (!classBatch) { setStudents([]); return; }
    setLoading(true);
    Promise.all([
      api.getStudents(`class_batch=${classBatch}&status=Active`),
      api.getAttendanceByDate(date, classBatch)
    ]).then(([studs, att]) => {
      setStudents(studs);
      const rec = {};
      att.forEach(a => { rec[a.student_id] = a.status; });
      setRecords(rec);
    }).catch(console.error).finally(() => setLoading(false));
  }, [classBatch, date]);

  const markAll = (status) => {
    const rec = {};
    students.forEach(s => { rec[s.id] = status; });
    setRecords(rec);
  };

  const handleSave = async () => {
    if (students.length === 0) return;
    setSaving(true);
    try {
      const attendanceRecords = students.map(s => ({
        student_id: s.id,
        status: records[s.id] || 'Present'
      }));
      await api.markAttendance({ date, records: attendanceRecords });
      
      const abs = students.filter(s => records[s.id] === 'Absent');
      if (abs.length > 0) {
        setAbsentees(abs);
        setShowNotifyModal(true);
      } else {
        setToast({ type: 'success', message: 'Attendance saved successfully!' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
      setTimeout(() => setToast(null), 3000);
    }
    setSaving(false);
  };

  const presentCount = Object.values(records).filter(v => v === 'Present').length;
  const absentCount = Object.values(records).filter(v => v === 'Absent').length;
  const lateCount = Object.values(records).filter(v => v === 'Late').length;

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}>{toast.message}</div></div>}

      <div className="page-header">
        <div><h2>Mark Attendance</h2><p>Select a class and date to mark attendance</p></div>
      </div>

      <div className="filter-bar">
        <input type="date" className="form-input" style={{ width: 180 }} value={date} onChange={e => setDate(e.target.value)} />
        <select className="form-select" value={classBatch} onChange={e => setClassBatch(e.target.value)}>
          <option value="">Select Class/Batch</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {students.length > 0 && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-success btn-sm" onClick={() => markAll('Present')}>✅ All Present</button>
            <button className="btn btn-danger btn-sm" onClick={() => markAll('Absent')}>❌ All Absent</button>
          </div>
        )}
      </div>

      {students.length > 0 && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 18 }}>
          <div className="stat-card blue" style={{ padding: 14 }}><div className="stat-value" style={{ fontSize: 22 }}>{students.length}</div><div className="stat-label">Total</div></div>
          <div className="stat-card green" style={{ padding: 14 }}><div className="stat-value" style={{ fontSize: 22 }}>{presentCount}</div><div className="stat-label">Present</div></div>
          <div className="stat-card red" style={{ padding: 14 }}><div className="stat-value" style={{ fontSize: 22 }}>{absentCount}</div><div className="stat-label">Absent</div></div>
          <div className="stat-card orange" style={{ padding: 14 }}><div className="stat-value" style={{ fontSize: 22 }}>{lateCount}</div><div className="stat-label">Late</div></div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {!classBatch ? (
            <div className="empty-state"><div className="empty-icon">📋</div><h3>Select a class</h3><p>Choose a class/batch to mark attendance</p></div>
          ) : loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : students.length === 0 ? (
            <div className="empty-state"><h3>No students in this class</h3></div>
          ) : (
            <>
              <div className="attendance-grid">
                {students.map(s => (
                  <div key={s.id} className="attendance-row">
                    <div className="student-info"><div className="student-name">{s.gender === 'Boy' ? '👦' : '👧'} {s.name}</div><div className="student-roll">{s.roll_number}</div></div>
                    <div className="attendance-btns">
                      {['Present', 'Absent', 'Late'].map(status => (
                        <button key={status} className={`att-btn ${(records[s.id] || '').toLowerCase() === status.toLowerCase() ? status.toLowerCase() : ''}`}
                          onClick={() => setRecords(prev => ({ ...prev, [s.id]: status }))}>
                          {status === 'Present' ? '✅' : status === 'Absent' ? '❌' : '⏰'} {status}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Save Attendance'}</button>
              </div>
            </>
          )}
        </div>
      </div>

      {showNotifyModal && (
        <div className="modal-overlay" onClick={() => setShowNotifyModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header"><h3>📢 Notify Absentees</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowNotifyModal(false)}>✕</button></div>
            <div className="modal-body">
              <p style={{ marginBottom: 16 }}>Attendance saved! Contact parents of {absentees.length} absent students:</p>
              <div className="table-container" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>Student</th><th>Roll No</th><th>Contact Parent</th></tr></thead>
                  <tbody>
                    {absentees.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td><span className="badge badge-info">{s.roll_number}</span></td>
                        <td>
                          <div className="action-group">
                            <button className="btn btn-success btn-sm" onClick={() => sendWhatsApp(s.parent_mobile, templates.absent(s.name), { student_id: s.id, category: 'Absent' })}>💬 WhatsApp</button>
                            <button className="btn btn-primary btn-sm" onClick={() => sendSMS(s.parent_mobile, templates.absent(s.name), { student_id: s.id, category: 'Absent' })}>📱 SMS</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowNotifyModal(false)}>Done</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
