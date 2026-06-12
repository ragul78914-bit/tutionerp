import { useState, useEffect } from 'react';
import api from '../services/api';

const MONTHS_LIST = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AttendanceHistory() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [classBatch, setClassBatch] = useState('');
  const [classes, setClasses] = useState([]);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getStudentStats().then(s => setClasses(s.classes || [])).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getAttendanceReport(month, year, classBatch)
      .then(setReport).catch(console.error).finally(() => setLoading(false));
  }, [month, year, classBatch]);

  return (
    <div>
      <div className="page-header">
        <div><h2>Attendance Report</h2><p>Monthly attendance summary</p></div>
      </div>

      <div className="filter-bar">
        <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS_LIST.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="form-select" value={classBatch} onChange={e => setClassBatch(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : report.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📅</div><h3>No attendance data</h3><p>No records for the selected period</p></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Roll No</th><th>Name</th><th>Class</th><th>Present</th><th>Absent</th><th>Late</th><th>Total</th><th>Percentage</th></tr>
              </thead>
              <tbody>
                {report.map(r => (
                  <tr key={r.id}>
                    <td><span className="badge badge-info">{r.roll_number}</span></td>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td>{r.class_batch}</td>
                    <td><span className="badge badge-success">{r.present_days}</span></td>
                    <td><span className="badge badge-danger">{r.absent_days}</span></td>
                    <td><span className="badge badge-warning">{r.late_days}</span></td>
                    <td>{r.total_days}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg-dark)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${r.percentage}%`, height: '100%', background: parseFloat(r.percentage) >= 75 ? 'var(--success)' : parseFloat(r.percentage) >= 50 ? 'var(--warning)' : 'var(--danger)', borderRadius: 3, transition: 'width 0.5s ease' }}></div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, minWidth: 45 }}>{r.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
