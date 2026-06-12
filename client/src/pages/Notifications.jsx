import { useState, useEffect } from 'react';
import api from '../services/api';
import { sendWhatsApp, sendSMS, makeCall } from '../utils/communication';

export default function Notifications() {
  const [tab, setTab] = useState('send');
  const [history, setHistory] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Send form
  const [sendMode, setSendMode] = useState('individual');
  const [msgType, setMsgType] = useState('WhatsApp');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [category, setCategory] = useState('General');
  const [message, setMessage] = useState('');
  
  // Bulk state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkList, setBulkList] = useState([]);

  useEffect(() => {
    api.getStudents('status=Active').then(setStudents).catch(console.error);
    api.getStudentStats().then(s => setClasses(s.classes || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (tab === 'history') {
      setLoading(true);
      api.getNotificationHistory().then(setHistory).catch(console.error).finally(() => setLoading(false));
    }
  }, [tab]);

  const showToast = (type, msg) => { setToast({ type, message: msg }); setTimeout(() => setToast(null), 4000); };

  const handleSend = async () => {
    if (!message.trim()) { showToast('error', 'Please enter a message'); return; }

    if (sendMode === 'individual') {
      if (!selectedStudent) { showToast('error', 'Select a student'); return; }
      const student = students.find(s => s.id === parseInt(selectedStudent));
      const personalMsg = message.replace('{name}', student.name).replace('{roll}', student.roll_number);
      
      const logData = { student_id: student.id, category };
      if (msgType === 'WhatsApp') {
        sendWhatsApp(student.parent_mobile, personalMsg, logData);
      } else {
        sendSMS(student.parent_mobile, personalMsg, logData);
      }
      showToast('success', 'Redirecting...');
    } else {
      let filtered = students;
      if (selectedClass) filtered = students.filter(s => s.class_batch === selectedClass);
      
      const list = filtered.map(s => ({
        ...s,
        personalMsg: message.replace('{name}', s.name).replace('{roll}', s.roll_number)
      }));
      
      setBulkList(list);
      setShowBulkModal(true);
    }
  };

  return (
    <div>
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}>{toast.message}</div></div>}

      <div className="page-header">
        <div><h2>Notifications</h2><p>Send messages via WhatsApp, SMS, or Phone</p></div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'send' ? 'active' : ''}`} onClick={() => setTab('send')}>📤 Send Message</button>
        <button className={`tab-btn ${tab === 'call' ? 'active' : ''}`} onClick={() => setTab('call')}>📞 Quick Call</button>
        <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>📋 History</button>
      </div>

      {tab === 'send' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><h3>Compose Message</h3></div>
            <div className="card-body">
              <div className="msg-type-btns" style={{ marginBottom: 16 }}>
                {['individual', 'bulk'].map(m => (
                  <button key={m} className={`msg-type-btn ${sendMode === m ? 'active' : ''}`} onClick={() => setSendMode(m)}>
                    {m === 'individual' ? '👤 Individual' : '👥 Bulk'}
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Channel</label>
                <div className="msg-type-btns">
                  {['SMS', 'WhatsApp'].map(t => (
                    <button key={t} className={`msg-type-btn ${msgType === t ? 'active' : ''}`} onClick={() => setMsgType(t)}>
                      {t === 'SMS' ? '📱' : '💬'} {t}
                    </button>
                  ))}
                </div>
              </div>

              {sendMode === 'individual' ? (
                <div className="form-group">
                  <label className="form-label">Select Student</label>
                  <select className="form-select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                    <option value="">Choose a student...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>)}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Filter by Class (optional)</label>
                  <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                    <option value="">All Classes (All Students)</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="General">General</option>
                  <option value="Absent">Absent Notification</option>
                  <option value="Fee Reminder">Fee Reminder</option>
                  <option value="Marks">Marks Report</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-textarea" rows={5} value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Type your message here... Use {name} for student name, {roll} for roll number" />
              </div>

              <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSend}>
                {msgType === 'WhatsApp' ? '💬 Open WhatsApp' : '📱 Open SMS'}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Quick Templates</h3></div>
            <div className="card-body">
              {[
                { label: '📋 Absent Notification', text: 'Your child {name} was absent today in tuition. Please ensure regular attendance.' },
                { label: '💰 Fee Reminder', text: 'Fee payment for this month is pending. Please pay before the due date.' },
                { label: '📝 Marks Report', text: 'Marks report for {name} has been published. Please check with the tuition center.' },
                { label: '📢 General Announcement', text: 'Dear Parent, this is to inform you that tuition classes will be held as scheduled.' },
                { label: '🏖️ Holiday Notice', text: 'Dear Parent, tuition will remain closed tomorrow due to holiday. Classes will resume the next day.' },
                { label: '📅 Test Announcement', text: 'Dear Parent, a test is scheduled for your child {name}. Please ensure preparation.' },
              ].map((t, i) => (
                <button key={i} className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 8 }}
                  onClick={() => setMessage(t.text)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'call' && (
        <div className="card">
          <div className="card-header"><h3>📞 Quick Call to Parent</h3></div>
          <div className="card-body">
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Student</th><th>Roll No</th><th>Parent</th><th>Mobile</th><th>Action</th></tr></thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td><span className="badge badge-info">{s.roll_number}</span></td>
                      <td>{s.parent_name}</td>
                      <td>{s.parent_mobile}</td>
                      <td><button className="call-btn" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => makeCall(s.parent_mobile)}>📞 Call</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          {loading ? <div className="loading-spinner"><div className="spinner"></div></div> : history.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📋</div><h3>No history found</h3></div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Student</th><th>Type</th><th>Category</th><th>Message</th><th>To</th><th>Status</th><th>Sent At</th></tr></thead>
                <tbody>
                  {history.map(n => (
                    <tr key={n.id}>
                      <td style={{ fontWeight: 500 }}>{n.student_name || '-'}</td>
                      <td><span className={`badge ${n.type === 'SMS' ? 'badge-info' : 'badge-success'}`}>{n.type}</span></td>
                      <td><span className="badge badge-gray">{n.category}</span></td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</td>
                      <td style={{ fontSize: 13 }}>{n.recipient_number}</td>
                      <td><span className="badge badge-success">Logged</span></td>
                      <td style={{ fontSize: 13 }}>{new Date(n.sent_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>👥 Bulk {msgType}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowBulkModal(false)}>✕</button></div>
            <div className="modal-body">
              <p style={{ marginBottom: 16 }}>Click buttons one by one to send to {bulkList.length} parents:</p>
              <div className="table-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>Student</th><th>Message Preview</th><th>Action</th></tr></thead>
                  <tbody>
                    {bulkList.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td style={{ fontSize: 12, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.personalMsg}</td>
                        <td>
                          <button className={`btn btn-sm ${msgType === 'WhatsApp' ? 'btn-success' : 'btn-primary'}`} 
                            onClick={() => msgType === 'WhatsApp' ? sendWhatsApp(s.parent_mobile, s.personalMsg, { student_id: s.id, category }) : sendSMS(s.parent_mobile, s.personalMsg, { student_id: s.id, category })}>
                            {msgType === 'WhatsApp' ? '💬 Send' : '📱 Send'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowBulkModal(false)}>Done</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
