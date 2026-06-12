import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';

export default function FeeReport() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getFeeReport(year).then(setReport).catch(console.error).finally(() => setLoading(false));
  }, [year]);

  const chartData = report.map(r => ({
    name: r.month.substring(0, 3),
    Collected: Number(r.collected_amount) || 0,
    Pending: Number(r.pending_amount) || 0
  }));

  const totalCollected = report.reduce((sum, r) => sum + (Number(r.collected_amount) || 0), 0);
  const totalPending = report.reduce((sum, r) => sum + (Number(r.pending_amount) || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div><h2>Fee Collection Report</h2><p>Monthly fee collection summary</p></div>
        <select className="form-select" style={{ width: 120 }} value={year} onChange={e => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card green"><div className="stat-icon green">💵</div>
          <div className="stat-value">₹{totalCollected.toLocaleString()}</div>
          <div className="stat-label">Total Collected</div>
        </div>
        <div className="stat-card orange"><div className="stat-icon orange">⏳</div>
          <div className="stat-value">₹{totalPending.toLocaleString()}</div>
          <div className="stat-label">Total Pending</div>
        </div>
        <div className="stat-card blue"><div className="stat-icon blue">📊</div>
          <div className="stat-value">{totalCollected + totalPending > 0 ? ((totalCollected / (totalCollected + totalPending)) * 100).toFixed(0) : 0}%</div>
          <div className="stat-label">Collection Rate</div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3>Monthly Collection Chart</h3></div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val) => `₹${val.toLocaleString()}`} />
                  <Bar dataKey="Collected" fill="#22C55E" radius={[4,4,0,0]} />
                  <Bar dataKey="Pending" fill="#F59E0B" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? <div className="loading-spinner"><div className="spinner"></div></div> : report.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📈</div><h3>No fee data</h3></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Month</th><th>Total Amount</th><th>Collected</th><th>Pending</th><th>Paid</th><th>Pending Count</th><th>Overdue</th></tr></thead>
              <tbody>
                {report.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.month} {r.year}</td>
                    <td>₹{Number(r.total_amount).toLocaleString()}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{Number(r.collected_amount).toLocaleString()}</td>
                    <td style={{ color: 'var(--warning)', fontWeight: 600 }}>₹{Number(r.pending_amount).toLocaleString()}</td>
                    <td><span className="badge badge-success">{r.paid_count}</span></td>
                    <td><span className="badge badge-warning">{r.pending_count}</span></td>
                    <td><span className="badge badge-danger">{r.overdue_count}</span></td>
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
