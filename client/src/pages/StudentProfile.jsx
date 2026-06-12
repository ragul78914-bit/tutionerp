import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { makeCall, sendWhatsApp, sendSMS } from '../utils/communication';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('academics'); // academics, attendance, fees

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getStudentProfile(id);
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!profile || !profile.student) return <div className="card empty-state"><h3>Student profile not found</h3></div>;

  const { student, attendance, fees, marks, performance } = profile;

  // Formatted communication message
  const handleSendFullWhatsAppResult = () => {
    if (marks.length === 0) {
      alert('No marks entries recorded yet for this student.');
      return;
    }
    const marksLines = marks.map(m => `${m.subject_name}: ${m.marks_obtained}/${m.max_marks}`).join('\n');
    const message = `Student: ${student.name} (Roll No: ${student.roll_number})\nClass: ${student.class_batch}\n\n${marksLines}\n\nOverall Percentage: ${performance.overallPercentage}%\nRank: ${performance.rank}\nStatus: ${performance.overallStatus}`;

    sendWhatsApp(student.parent_mobile, message, { student_id: student.id, category: 'Marks' });
  };

  const handleSendSingleWhatsAppMark = (m) => {
    const message = `Student: ${student.name}\nClass: ${student.class_batch}\nSubject: ${m.subject_name}\nMarks: ${m.marks_obtained}/${m.max_marks}\nPercentage: ${m.percentage}%\nGrade: ${m.grade}\nStatus: ${m.status}`;

    sendWhatsApp(student.parent_mobile, message, { student_id: student.id, category: 'Marks' });
  };

  return (
    <div>
      {/* Back & Edit Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button className="btn btn-outline" onClick={() => navigate('/students')}>
          ← Back to Students
        </button>
        <button className="btn btn-primary" onClick={() => navigate(`/students/edit/${student.id}`)}>
          ✏️ Edit Profile
        </button>
      </div>

      {/* -------------------- BANNER / HEADER CARD -------------------- */}
      <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
        <div style={{
          height: 120,
          background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #3B82F6 100%)',
          position: 'relative'
        }}></div>
        <div style={{
          padding: '0 28px 24px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          marginTop: -60,
          gap: 20
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 20 }}>
            {/* Avatar Circle */}
            <div style={{
              width: 110, height: 110,
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              borderRadius: '50%',
              border: '5px solid white',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 800,
              color: 'white',
              flexShrink: 0
            }}>
              {student.name.charAt(0)}
            </div>

            {/* Profile Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{student.name}</h2>
                <span className={`badge badge-${student.status === 'Active' ? 'success' : 'gray'}`}>
                  {student.status}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, marginTop: 4 }}>
                Roll Number: <b>{student.roll_number}</b> &nbsp;|&nbsp; Class: <b>{student.class_batch}</b>
              </p>
            </div>

            {/* Call / Message Actions Group */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignSelf: 'center' }}>
              <button className="call-btn" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => makeCall(student.parent_mobile)}>
                📞 Call Parent
              </button>
              <button
                className="call-btn"
                style={{ padding: '8px 16px', fontSize: 13, background: '#DCF8C6', color: '#075E54', borderColor: '#4FCE5D' }}
                onClick={() => sendWhatsApp(student.parent_mobile, `Tuition update for ${student.name}: `, { student_id: student.id, category: 'General' })}
              >
                💬 WhatsApp
              </button>
              <button
                className="call-btn"
                style={{ padding: '8px 16px', fontSize: 13, background: '#E0F2FE', color: '#0369A1', borderColor: '#7DD3FC' }}
                onClick={() => sendSMS(student.parent_mobile, `Tuition update for ${student.name}: `, { student_id: student.id, category: 'General' })}
              >
                📱 SMS
              </button>
              <button
                className="btn btn-success btn-sm"
                style={{ borderRadius: 50, padding: '7px 16px', fontSize: 13 }}
                onClick={handleSendFullWhatsAppResult}
              >
                📢 Send Report via WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------- QUICK STATS BAR -------------------- */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon blue">🎯</div>
          <div className="stat-value">{performance.overallPercentage}%</div>
          <div className="stat-label">Overall Percentage</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange">🏆</div>
          <div className="stat-value">Rank {performance.rank}</div>
          <div className="stat-label">Rank in Batch</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green">📅</div>
          <div className="stat-value">{attendance.stats.percentage}%</div>
          <div className="stat-label">Attendance Rate</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon red">💰</div>
          <div className="stat-value" style={{ color: fees.pending > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {fees.pending > 0 ? `₹${fees.pending.toLocaleString()}` : 'No Dues'}
          </div>
          <div className="stat-label">Pending Fees</div>
        </div>
      </div>

      {/* -------------------- MAIN TWO COLUMN LAYOUT -------------------- */}
      <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* LEFT COLUMN: INTERACTIVE TABS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Tab buttons */}
          <div className="card" style={{ padding: 6 }}>
            <div className="tabs" style={{ margin: 0, border: 'none' }}>
              <button className={`tab-btn ${activeTab === 'academics' ? 'active' : ''}`} onClick={() => setActiveTab('academics')} style={{ flex: 1, textAlign: 'center' }}>📚 Academic Performance</button>
              <button className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')} style={{ flex: 1, textAlign: 'center' }}>📋 Attendance Audit</button>
              <button className={`tab-btn ${activeTab === 'fees' ? 'active' : ''}`} onClick={() => setActiveTab('fees')} style={{ flex: 1, textAlign: 'center' }}>💰 Fee Ledger</button>
            </div>
          </div>

          {/* TAB 1: ACADEMICS */}
          {activeTab === 'academics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Performance Trend Chart */}
              {performance.monthlyTrend && performance.monthlyTrend.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <h3>Academic Monthly Progress</h3>
                  </div>
                  <div className="card-body">
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={performance.monthlyTrend}>
                          <defs>
                            <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => [`${value}%`, 'Average Score']} />
                          <Area type="monotone" dataKey="percentage" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorPct)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Subject Scores Grid */}
              <div className="card">
                <div className="card-header">
                  <h3>Subject-wise Marks</h3>
                  <button className="btn btn-outline btn-sm" onClick={handleSendFullWhatsAppResult}>
                    Send All Results
                  </button>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {marks.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📝</div>
                      <h3>No Exam Marks Logged</h3>
                      <p>Scores will be listed here once subject marks are submitted.</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>Exam Date</th>
                            <th>Score Obtained</th>
                            <th>Total Marks</th>
                            <th>Percentage</th>
                            <th>Grade</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {marks.map(m => (
                            <tr key={m.id}>
                              <td style={{ fontWeight: 600 }}>{m.subject_name}</td>
                              <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                {m.exam_date ? new Date(m.exam_date).toLocaleDateString() : '-'}
                              </td>
                              <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{parseFloat(m.marks_obtained)}</td>
                              <td>{m.max_marks}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ flex: 1, height: 6, background: 'var(--bg-dark)', borderRadius: 3, overflow: 'hidden', minWidth: 40, maxWidth: 60 }}>
                                    <div style={{
                                      width: `${m.percentage}%`, height: '100%', borderRadius: 3,
                                      background: parseFloat(m.percentage) >= 75 ? 'var(--success)' : parseFloat(m.percentage) >= 35 ? 'var(--warning)' : 'var(--danger)'
                                    }}></div>
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 700 }}>{m.percentage}%</span>
                                </div>
                              </td>
                              <td><b>{m.grade}</b></td>
                              <td>
                                <span className={`badge badge-${m.status === 'PASS' ? 'success' : 'danger'}`}>
                                  {m.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  className="call-btn"
                                  style={{ background: '#DCF8C6', color: '#075E54', borderColor: '#4FCE5D' }}
                                  onClick={() => handleSendSingleWhatsAppMark(m)}
                                  title="Send this result via WhatsApp"
                                >
                                  💬 Send
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="card">
              <div className="card-header">
                <h3>Attendance Audit history</h3>
                <span className="badge badge-success">Rate: {attendance.stats.percentage}%</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {attendance.history.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📅</div>
                    <h3>No Attendance Logged</h3>
                    <p>Attendance history is empty for this student.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Marked On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.history.map(a => (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 600 }}>{new Date(a.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                            <td>
                              <span className={`badge badge-${a.status === 'Present' ? 'success' : a.status === 'Late' ? 'warning' : 'danger'}`}>
                                {a.status}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-light)', fontSize: 12 }}>
                              {new Date(a.marked_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FEES */}
          {activeTab === 'fees' && (
            <div className="card">
              <div className="card-header">
                <h3>Dues & Payment Ledger</h3>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span className="badge badge-success" style={{ padding: '6px 12px' }}>Total Paid: ₹{fees.paid.toLocaleString()}</span>
                  {fees.pending > 0 && <span className="badge badge-danger" style={{ padding: '6px 12px' }}>Due: ₹{fees.pending.toLocaleString()}</span>}
                </div>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {fees.history.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">💰</div>
                    <h3>No Fee Records Registered</h3>
                    <p>There are no fee bills generated for this student profile.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Billing Month</th>
                          <th>Required Amount</th>
                          <th>Paid Amount</th>
                          <th>Dues Outstanding</th>
                          <th>Due Date</th>
                          <th>Paid Date</th>
                          <th>Mode</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fees.history.map(f => {
                          const outstanding = parseFloat(f.amount) - parseFloat(f.paid_amount || 0);
                          return (
                            <tr key={f.id}>
                              <td style={{ fontWeight: 600 }}>{f.month} {f.year}</td>
                              <td>₹{parseFloat(f.amount).toLocaleString()}</td>
                              <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{parseFloat(f.paid_amount || 0).toLocaleString()}</td>
                              <td style={{ color: outstanding > 0 ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 600 }}>
                                ₹{outstanding.toLocaleString()}
                              </td>
                              <td style={{ fontSize: 13 }}>{new Date(f.due_date).toLocaleDateString()}</td>
                              <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                {f.paid_date ? new Date(f.paid_date).toLocaleDateString() : '-'}
                              </td>
                              <td style={{ fontSize: 13, color: 'var(--text-light)' }}>{f.payment_mode || '-'}</td>
                              <td>
                                <span className={`badge badge-${f.status === 'Paid' ? 'success' : f.status === 'Overdue' ? 'danger' : 'warning'}`}>
                                  {f.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DETAILED INFO CARDS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Card 1: Personal Profile */}
          <div className="card">
            <div className="card-header">
              <h3>Personal Details</h3>
            </div>
            <div className="card-body" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  ['Gender', `${student.gender === 'Boy' ? '👦' : '👧'} ${student.gender}`],
                  ['Admission Date', new Date(student.admission_date).toLocaleDateString(undefined, { dateStyle: 'medium' })],
                  ['Home Address', student.address || 'Not Provided'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
                    <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Parent Profile */}
          <div className="card">
            <div className="card-header">
              <h3>Guardian Details</h3>
            </div>
            <div className="card-body" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  ['Parent / Guardian', student.parent_name],
                  ['Contact Mobile', student.parent_mobile],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
                    <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
