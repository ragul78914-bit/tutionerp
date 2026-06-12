import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { makeCall, sendWhatsApp, sendSMS, templates } from '../utils/communication';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [classes, setClasses] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (classFilter) params.set('class_batch', classFilter);
      if (genderFilter) params.set('gender', genderFilter);
      const data = await api.getStudents(params.toString());
      setStudents(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
    api.getStudentStats().then(s => setClasses(s.classes || [])).catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchStudents, 300);
    return () => clearTimeout(timer);
  }, [search, classFilter, genderFilter]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteStudent(deleteId);
      setDeleteId(null);
      fetchStudents();
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>Students</h2><p>Manage all student records</p></div>
        <Link to="/students/add" className="btn btn-primary" id="add-student-btn">+ Add Student</Link>
      </div>

      <div className="filter-bar">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} id="student-search" />
        </div>
        <select className="form-select" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-select" value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
          <option value="">All Gender</option>
          <option value="Boy">Boys</option>
          <option value="Girl">Girls</option>
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎓</div>
            <h3>No students found</h3>
            <p>Add your first student to get started</p>
            <Link to="/students/add" className="btn btn-primary">+ Add Student</Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th><th>Name</th><th>Gender</th><th>Class/Batch</th>
                  <th>Parent</th><th>Mobile</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td><span className="badge badge-info">{s.roll_number}</span></td>
                    <td><Link to={`/students/${s.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>{s.name}</Link></td>
                    <td>{s.gender === 'Boy' ? '👦' : '👧'} {s.gender}</td>
                    <td>{s.class_batch}</td>
                    <td>{s.parent_name}</td>

                    <td>
                      <div className="action-group">
                        <button className="call-btn" onClick={() => makeCall(s.parent_mobile)} title="Call Parent">📞</button>
                        <button className="call-btn" style={{ background: '#DCF8C6', color: '#075E54', borderColor: '#4FCE5D' }} 
                          onClick={() => sendWhatsApp(s.parent_mobile, templates.absent(s.name), { student_id: s.id, category: 'General' })} title="WhatsApp Parent">💬</button>
                        <button className="call-btn" style={{ background: '#E0F2FE', color: '#0369A1', borderColor: '#7DD3FC' }} 
                          onClick={() => sendSMS(s.parent_mobile, templates.absent(s.name), { student_id: s.id, category: 'General' })} title="SMS Parent">📱</button>
                      </div>
                    </td>
                    <td><span className={`badge ${s.status === 'Active' ? 'badge-success' : 'badge-gray'}`}>{s.status}</span></td>
                    <td>
                      <div className="action-group">
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/students/edit/${s.id}`)}>✏️</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleteId(s.id)} style={{ color: 'var(--danger)' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Confirm Delete</h3></div>
            <div className="modal-body"><p>Are you sure you want to delete this student? This action cannot be undone.</p></div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
