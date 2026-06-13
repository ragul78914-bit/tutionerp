import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../services/api';

const COLORS = ['#2563EB', '#EC4899', '#22C55E', '#F59E0B', '#EF4444'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatCard({ icon, value, label, sub, colorClass }) {
  return (
    <div className={`stat-card ${colorClass}`}>
      <div className={`stat-icon ${colorClass}`}>{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch(err => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-spinner"><div className="spinner"></div></div>
  );

  if (error) return (
    <div className="empty-state" style={{ padding: 40 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <h3 style={{ marginBottom: 8 }}>Dashboard Error</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{error}</p>
      <button className="btn btn-primary" onClick={() => { setLoading(true); setError(null); api.getDashboard().then(setData).catch(e => setError(e.message)).finally(() => setLoading(false)); }}>
        🔄 Retry
      </button>
    </div>
  );

  if (!data) return (
    <div className="empty-state"><h3>Unable to load dashboard</h3></div>
  );

  const genderData = [
    { name: 'Boys', value: data.boys || 0 },
    { name: 'Girls', value: data.girls || 0 }
  ].filter(d => d.value > 0);

  const trendData = (data.attendanceTrend || []).map(t => ({
    name: MONTHS[t.month - 1],
    Present: t.present,
    Absent: t.absent,
    Total: t.total
  }));

  const attendanceData = [
    { name: 'Present', value: data.presentToday || 0 },
    { name: 'Absent', value: data.absentToday || 0 },
    { name: 'Late', value: data.lateToday || 0 }
  ].filter(d => d.value > 0);

  const todayDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>Dashboard Overview</h2>
          <p>Welcome back! Here&apos;s what&apos;s happening today — <strong>{todayDate}</strong></p>
        </div>
      </div>

      {/* Row 1: Student Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard icon="🎓" value={data.totalStudents} label="Total Students" sub={`👦 ${data.boys} Boys  |  👧 ${data.girls} Girls`} colorClass="blue" />
        <StatCard icon="✅" value={data.presentToday} label="Present Today" sub={`${data.attendancePercentage}% attendance rate`} colorClass="green" />
        <StatCard icon="❌" value={data.absentToday} label="Absent Today" colorClass="red" />
        <StatCard icon="⏰" value={data.lateToday} label="Late Today" colorClass="orange" />
      </div>

      {/* Row 2: Financial Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard icon="📊" value={`${data.attendancePercentage}%`} label="Attendance Rate" sub="Present + Late / Total" colorClass="blue" />
        <StatCard icon="👦" value={data.boys} label="Total Boys" colorClass="blue" />
        <StatCard icon="👧" value={data.girls} label="Total Girls" colorClass="green" />
        <StatCard icon="💰" value={`₹${Number(data.pendingFeesAmount || 0).toLocaleString('en-IN')}`} label={`Pending Fees (${data.pendingFeesCount} records)`} colorClass="red" />
        <StatCard icon="💵" value={`₹${Number(data.monthlyCollection || 0).toLocaleString('en-IN')}`} label="Monthly Collection" sub="This month" colorClass="green" />
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Attendance Trend Chart */}
        <div className="card">
          <div className="card-header">
            <h3>📈 Attendance Trend (Last 6 Months)</h3>
          </div>
          <div className="card-body">
            {trendData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                      formatter={(value, name) => [value, name]}
                    />
                    <Legend />
                    <Bar dataKey="Present" fill="#22C55E" radius={[4,4,0,0]} />
                    <Bar dataKey="Absent" fill="#EF4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p>📭 No attendance data recorded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Today's Attendance Donut + Gender Distribution */}
        <div className="card">
          <div className="card-header">
            <h3>🎯 Today&apos;s Attendance Breakdown</h3>
          </div>
          <div className="card-body">
            {attendanceData.length > 0 ? (
              <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceData}
                      cx="50%" cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {attendanceData.map((_, i) => <Cell key={i} fill={['#22C55E','#EF4444','#F59E0B'][i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p>📭 No attendance marked for today yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gender Distribution + Info */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header"><h3>👥 Gender Distribution</h3></div>
          <div className="card-body">
            {genderData.length > 0 ? (
              <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {genderData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p>📭 No student data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Info Panel */}
        <div className="card">
          <div className="card-header"><h3>📋 Quick Summary</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: '🎓', label: 'Total Active Students', value: data.totalStudents },
                { icon: '👦', label: 'Boys', value: data.boys },
                { icon: '👧', label: 'Girls', value: data.girls },
                { icon: '✅', label: 'Present Today', value: data.presentToday },
                { icon: '❌', label: 'Absent Today', value: data.absentToday },
                { icon: '⏰', label: 'Late Today', value: data.lateToday },
                { icon: '📊', label: 'Attendance Rate', value: `${data.attendancePercentage}%` },
                { icon: '💰', label: 'Pending Fee Amount', value: `₹${Number(data.pendingFeesAmount || 0).toLocaleString('en-IN')}` },
                { icon: '💵', label: 'Monthly Fee Collection', value: `₹${Number(data.monthlyCollection || 0).toLocaleString('en-IN')}` },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.icon} {item.label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Tests & Recent Notifications */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>📝 Upcoming Tests</h3></div>
          <div className="card-body">
            {data.upcomingTests?.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>Test / Subject</th><th>Class / Batch</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {data.upcomingTests.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600 }}>{t.name}</td>
                        <td><span className="badge badge-info">{t.class_batch}</span></td>
                        <td>{new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '30px' }}>
                <p>📭 No upcoming tests scheduled</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>🔔 Recent Notifications</h3></div>
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
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                      {new Date(n.sent_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '30px' }}>
                <p>📭 No recent notifications</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
