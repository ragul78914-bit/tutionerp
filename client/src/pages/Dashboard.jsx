import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';

const COLORS = ['#2563EB', '#38BDF8', '#22C55E', '#F59E0B', '#EF4444'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!data) return <div className="empty-state"><h3>Unable to load dashboard</h3></div>;

  const genderData = [
    { name: 'Boys', value: data.boys },
    { name: 'Girls', value: data.girls }
  ].filter(d => d.value > 0);

  const trendData = (data.attendanceTrend || []).map(t => ({
    name: MONTHS[t.month - 1],
    Present: t.present,
    Absent: t.absent
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard Overview</h2>
          <p>Welcome back! Here's what's happening today.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon blue">🎓</div>
          <div className="stat-value">{data.totalStudents}</div>
          <div className="stat-label">Total Students</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green">✅</div>
          <div className="stat-value">{data.presentToday}</div>
          <div className="stat-label">Present Today</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon red">❌</div>
          <div className="stat-value">{data.absentToday}</div>
          <div className="stat-label">Absent Today</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange">📊</div>
          <div className="stat-value">{data.attendancePercentage}%</div>
          <div className="stat-label">Attendance Rate</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon sky">👦</div>
          <div className="stat-value">{data.boys}</div>
          <div className="stat-label">Total Boys</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green">👧</div>
          <div className="stat-value">{data.girls}</div>
          <div className="stat-label">Total Girls</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange">💰</div>
          <div className="stat-value">₹{Number(data.pendingFeesAmount || 0).toLocaleString()}</div>
          <div className="stat-label">Pending Fees ({data.pendingFeesCount})</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green">💵</div>
          <div className="stat-value">₹{Number(data.monthlyCollection || 0).toLocaleString()}</div>
          <div className="stat-label">Monthly Collection</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header"><h3>Attendance Trend</h3></div>
          <div className="card-body">
            {trendData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="Present" fill="#22C55E" radius={[4,4,0,0]} />
                    <Bar dataKey="Absent" fill="#EF4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p>No attendance data yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Gender Distribution</h3></div>
          <div className="card-body">
            {genderData.length > 0 ? (
              <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {genderData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p>No student data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>Upcoming Tests</h3></div>
          <div className="card-body">
            {data.upcomingTests?.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Test</th><th>Class</th><th>Date</th></tr></thead>
                  <tbody>
                    {data.upcomingTests.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600 }}>{t.name}</td>
                        <td><span className="badge badge-info">{t.class_batch}</span></td>
                        <td>{new Date(t.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-state" style={{ padding: '30px' }}><p>No upcoming tests</p></div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Recent Notifications</h3></div>
          <div className="card-body">
            {data.recentNotifications?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.recentNotifications.slice(0, 6).map(n => (
                  <div key={n.id} style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{n.student_name || 'General'}</span>
                      <span className={`badge badge-${n.type === 'SMS' ? 'info' : 'success'}`}>{n.type}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
                  </div>
                ))}
              </div>
            ) : <div className="empty-state" style={{ padding: '30px' }}><p>No recent notifications</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
