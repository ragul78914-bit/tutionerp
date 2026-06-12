import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Settings() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [newSubjectClass, setNewSubjectClass] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.getSubjects().then(setSubjects).catch(console.error);
    api.getStudentStats().then(s => setClasses(s.classes || [])).catch(console.error);
  }, []);

  const showToast = (type, msg) => { setToast({ type, message: msg }); setTimeout(() => setToast(null), 3000); };

  const addSubject = async () => {
    if (!newSubject.trim()) return;
    try {
      const s = await api.addSubject({ name: newSubject, class_batch: newSubjectClass || null });
      setSubjects([...subjects, s]);
      setNewSubject('');
      showToast('success', 'Subject added!');
    } catch (err) { showToast('error', err.message); }
  };

  const deleteSubject = async (id) => {
    try {
      await api.deleteSubject(id);
      setSubjects(subjects.filter(s => s.id !== id));
      showToast('success', 'Subject deleted');
    } catch (err) { showToast('error', err.message); }
  };

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}>{toast.message}</div></div>}

      <div className="page-header">
        <div><h2>Settings</h2><p>Configure subjects and system settings</p></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>📚 Manage Subjects</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input className="form-input" placeholder="Subject name" value={newSubject} onChange={e => setNewSubject(e.target.value)} style={{ flex: 1 }} />
              <select className="form-select" style={{ width: 140 }} value={newSubjectClass} onChange={e => setNewSubjectClass(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="btn btn-primary" onClick={addSubject}>Add</button>
            </div>
            {subjects.length === 0 ? (
              <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: 20 }}>No subjects configured</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {subjects.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg)', borderRadius: 8 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</span>
                      {s.class_batch && <span className="badge badge-info" style={{ marginLeft: 8 }}>{s.class_batch}</span>}
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteSubject(s.id)}>🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>📊 System Info</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                ['Application', 'Tuition ERP v1.0'],
                ['Active Classes', classes.length || '0'],
                ['Subjects Configured', subjects.length],
                ['Database', 'MySQL'],
                ['API Server', 'Express.js'],
                ['Messaging', 'Twilio SMS & WhatsApp'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{label}</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3>🔔 Notification Configuration</h3></div>
        <div className="card-body">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            To enable SMS and WhatsApp notifications, configure your Twilio credentials in the server <code>.env</code> file:
          </p>
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8 }}>
            TWILIO_ACCOUNT_SID=your_account_sid<br />
            TWILIO_AUTH_TOKEN=your_auth_token<br />
            TWILIO_PHONE_NUMBER=your_phone_number<br />
            TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
          </div>
        </div>
      </div>
    </div>
  );
}
