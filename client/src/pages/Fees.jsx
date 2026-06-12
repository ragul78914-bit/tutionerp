import { useState, useEffect } from 'react';
import api from '../services/api';
import { sendWhatsApp, sendSMS } from '../utils/communication';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Fees() {
  const [fees, setFees] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Panels
  const [showCreate, setShowCreate] = useState(false);
  const [showPay, setShowPay] = useState(null); // fee object
  const [showRemind, setShowRemind] = useState(false);
  const [pendingList, setPendingList] = useState([]);
  const [toast, setToast] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({ month: MONTHS[new Date().getMonth()], year: new Date().getFullYear(), amount: '', due_date: '' });
  const [payForm, setPayForm] = useState({ paid_amount: '', payment_mode: 'Cash' });

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Accordion state: holds which months are expanded
  const [expandedMonths, setExpandedMonths] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fData, sStats] = await Promise.all([api.getFees(), api.getStudentStats()]);
      setFees(fData);
      setClasses(sStats.classes || []);
      
      // Auto-expand the most recent month by default
      if (fData.length > 0) {
        const sortedGroups = getGroupedAndSortedKeys(fData);
        if (sortedGroups.length > 0) {
          setExpandedMonths({ [sortedGroups[0]]: true });
        }
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to fetch fee data');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createFees(createForm);
      setShowCreate(false);
      showToast('success', `Fee bills generated successfully for ${createForm.month} ${createForm.year}!`);
      fetchData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    try {
      await api.updateFee(showPay.id, {
        paid_amount: parseFloat(payForm.paid_amount),
        payment_mode: payForm.payment_mode
      });
      setShowPay(null);
      showToast('success', 'Payment logged successfully!');
      fetchData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const openReminders = async () => {
    try {
      const data = await api.sendFeeReminders({ fee_ids: [] });
      setPendingList(data);
      setShowRemind(true);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const toggleMonthAccordion = (key) => {
    setExpandedMonths(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Prefilled Detailed Message Builders
  const getWhatsAppMessage = (f, type = 'Reminder') => {
    if (type === 'Receipt') {
      return `Dear Parent,\nWe have successfully received the tuition fee payment of ₹${Number(f.paid_amount).toLocaleString()} for your child ${f.student_name} for the month of ${f.month} ${f.year}.\n\nTotal Paid: ₹${Number(f.paid_amount).toLocaleString()}\nPayment Mode: ${f.payment_mode || 'Cash'}\nReceipt Date: ${f.paid_date ? new Date(f.paid_date).toLocaleDateString() : new Date().toLocaleDateString()}\n\nThank you for your prompt support!\nWarm regards,\nTuition Admin`;
    }
    const pending = Number(f.amount) - Number(f.paid_amount || 0);
    return `Dear Parent,\nThis is a friendly reminder that the tuition fee for your child ${f.student_name} for the month of ${f.month} ${f.year} remains outstanding.\n\nMonthly Fee: ₹${Number(f.amount).toLocaleString()}\nPaid Amount: ₹${Number(f.paid_amount).toLocaleString()}\nPending Dues: ₹${pending.toLocaleString()}\nDue Date: ${new Date(f.due_date).toLocaleDateString()}\n\nPlease clear the outstanding dues at your earliest convenience.\n\nThank you,\nTuition Admin`;
  };

  // Helper to group by Month + Year
  const getGroupedAndSortedKeys = (dataList) => {
    const monthsKeys = [...new Set(dataList.map(item => `${item.month} ${item.year}`))];
    return monthsKeys.sort((a, b) => {
      const [mA, yA] = a.split(' ');
      const [mB, yB] = b.split(' ');
      if (yA !== yB) return parseInt(yB) - parseInt(yA); // Year desc
      return MONTHS.indexOf(mB) - MONTHS.indexOf(mA); // Month desc
    });
  };

  // Apply filters and searches
  const filteredFees = fees.filter(f => {
    const matchesSearch = f.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          f.roll_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === '' || f.class_batch === classFilter;
    const matchesStatus = statusFilter === '' || f.status === statusFilter;
    const matchesMonth = monthFilter === '' || f.month === monthFilter;
    const matchesYear = yearFilter === '' || String(f.year) === yearFilter;
    return matchesSearch && matchesClass && matchesStatus && matchesMonth && matchesYear;
  });

  // Calculate high level summaries
  const totalBilled = fees.reduce((sum, f) => sum + parseFloat(f.amount), 0);
  const totalCollected = fees.reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0);
  const totalOutstanding = totalBilled - totalCollected;
  const currentMonthName = MONTHS[new Date().getMonth()];
  const currentYearNum = new Date().getFullYear();
  const currentMonthFees = fees.filter(f => f.month === currentMonthName && f.year === currentYearNum);
  const currentMonthBilled = currentMonthFees.reduce((sum, f) => sum + parseFloat(f.amount), 0);
  const currentMonthCollected = currentMonthFees.reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0);
  const currentMonthCollectionRate = currentMonthBilled > 0 ? ((currentMonthCollected / currentMonthBilled) * 100).toFixed(0) : 100;

  // Group filtered results
  const groupedFees = {};
  filteredFees.forEach(f => {
    const key = `${f.month} ${f.year}`;
    if (!groupedFees[key]) groupedFees[key] = [];
    groupedFees[key].push(f);
  });

  const sortedMonthKeys = getGroupedAndSortedKeys(filteredFees);

  return (
    <div>
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>Structured Fee Management</h2>
          <p>Organize, track, and reminders system for monthly student fee accounts</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-warning" onClick={openReminders}>🔔 Send Reminders ({fees.filter(x => x.status !== 'Paid').length})</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Generate Fee Bills</button>
        </div>
      </div>

      {/* Summary KPI Dashboard */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card blue">
          <div className="stat-icon blue">💰</div>
          <div className="stat-value">₹{totalCollected.toLocaleString()}</div>
          <div className="stat-label">Total Fee Collection</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon red">💸</div>
          <div className="stat-value" style={{ color: totalOutstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>
            ₹{totalOutstanding.toLocaleString()}
          </div>
          <div className="stat-label">Outstanding Pending Dues</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange">📅</div>
          <div className="stat-value">{currentMonthCollectionRate}%</div>
          <div className="stat-label">{currentMonthName} Collection rate</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green">📊</div>
          <div className="stat-value">
            {((totalCollected / (totalBilled || 1)) * 100).toFixed(0)}%
          </div>
          <div className="stat-label">Lifetime Recovery rate</div>
        </div>
      </div>

      {/* Advanced Filter Panel Card */}
      <div className="card" style={{ marginBottom: 24, padding: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div className="search-bar" style={{ flex: 1, minWidth: 260 }}>
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search student name or roll number..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Class Filter */}
            <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Status Filter */}
            <select className="form-select" style={{ width: 'auto', minWidth: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
            {/* Month Filter */}
            <select className="form-select" style={{ width: 'auto', minWidth: 140 }} value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
              <option value="">All Months</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {/* Year Filter */}
            <select className="form-select" style={{ width: 'auto', minWidth: 110 }} value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
              <option value="">All Years</option>
              {Array.from(new Set(fees.map(x => x.year))).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {/* Clear filters */}
            {(searchTerm || classFilter || statusFilter || monthFilter || yearFilter) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setClassFilter(''); setStatusFilter(''); setSearchTerm(''); setMonthFilter(''); setYearFilter(''); }}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chronological Monthly Groups */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : sortedMonthKeys.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <h3>No Fee Records Logged</h3>
            <p>Generate fee structures or adjust active search filters to view ledgers.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>Create Fees Now</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {sortedMonthKeys.map(monthKey => {
            const list = groupedFees[monthKey] || [];
            
            // Sub-metrics inside this monthly cycle
            const monthBilled = list.reduce((sum, f) => sum + parseFloat(f.amount), 0);
            const monthCollected = list.reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0);
            const monthOutstanding = monthBilled - monthCollected;
            const monthCollectionRate = monthBilled > 0 ? ((monthCollected / monthBilled) * 100).toFixed(0) : 100;

            const isExpanded = !!expandedMonths[monthKey];

            // Split into Paid & Pending lists
            const pendingStudents = list.filter(f => f.status !== 'Paid');
            const paidStudents = list.filter(f => f.status === 'Paid');

            return (
              <div className="card" key={monthKey} style={{ borderLeft: '5px solid var(--primary)', overflow: 'hidden' }}>
                {/* Collapsible Monthly Card Header Banner */}
                <div
                  onClick={() => toggleMonthAccordion(monthKey)}
                  style={{
                    padding: '16px 20px',
                    background: 'var(--border-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>📂 {monthKey} Fees</h3>
                    <span className="badge badge-info">{list.length} Students billed</span>
                    <span className="badge badge-success" style={{ fontWeight: 700 }}>₹{monthCollected.toLocaleString()} Collected</span>
                    {monthOutstanding > 0 ? (
                      <span className="badge badge-danger" style={{ fontWeight: 700 }}>₹{monthOutstanding.toLocaleString()} Dues</span>
                    ) : (
                      <span className="badge badge-success" style={{ background: '#DCF8C6', color: '#15803D' }}>✅ Cleared</span>
                    )}
                    <span className="badge badge-gray" style={{ fontWeight: 600 }}>Rate: {monthCollectionRate}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </span>
                    <span style={{ fontSize: 16, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'var(--transition)' }}>
                      ▼
                    </span>
                  </div>
                </div>

                {/* Collapsible Monthly Card Body Detail */}
                {isExpanded && (
                  <div className="card-body" style={{ padding: 0 }}>
                    
                    {/* SECTION A: PENDING STUDENTS */}
                    <div style={{ borderBottom: pendingStudents.length > 0 && paidStudents.length > 0 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ padding: '16px 20px', background: 'var(--danger-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          🔴 Outstanding Dues ({pendingStudents.length})
                        </h4>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                          Action required: Send WhatsApp or log payment
                        </span>
                      </div>
                      {pendingStudents.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                          <span style={{ fontSize: 18 }}>🏆</span>
                          <p style={{ fontSize: 13, margin: '4px 0 0', fontWeight: 600, color: 'var(--success)' }}>All billing cleared for this cycle!</p>
                        </div>
                      ) : (
                        <div className="table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Roll Number</th>
                                <th>Student Name</th>
                                <th>Class</th>
                                <th>Monthly Fee</th>
                                <th>Paid Amount</th>
                                <th>Pending Amount</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pendingStudents.map(f => {
                                const pending = parseFloat(f.amount) - parseFloat(f.paid_amount || 0);
                                return (
                                  <tr key={f.id}>
                                    <td><span className="badge badge-gray">{f.roll_number}</span></td>
                                    <td style={{ fontWeight: 600 }}>{f.student_name}</td>
                                    <td><span className="badge badge-info">{f.class_batch}</span></td>
                                    <td>₹{parseFloat(f.amount).toLocaleString()}</td>
                                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{parseFloat(f.paid_amount || 0).toLocaleString()}</td>
                                    <td style={{ color: 'var(--danger)', fontWeight: 700 }}>₹{pending.toLocaleString()}</td>
                                    <td>{new Date(f.due_date).toLocaleDateString()}</td>
                                    <td>
                                      <span className={`badge badge-${f.status === 'Overdue' ? 'danger' : 'warning'}`}>
                                        {f.status}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <div className="action-group" style={{ justifyContent: 'flex-end' }}>
                                        <button
                                          className="btn btn-success btn-sm"
                                          onClick={() => { setShowPay(f); setPayForm({ paid_amount: pending, payment_mode: 'Cash' }); }}
                                        >
                                          💵 Pay Dues
                                        </button>
                                        <button
                                          className="call-btn"
                                          style={{ background: '#DCF8C6', color: '#075E54', borderColor: '#4FCE5D' }}
                                          onClick={() => sendWhatsApp(f.parent_mobile, getWhatsAppMessage(f, 'Reminder'), { student_id: f.student_id, category: 'Fee Reminder' })}
                                          title="Send WhatsApp Reminder"
                                        >
                                          💬 WhatsApp
                                        </button>
                                        <button
                                          className="call-btn"
                                          style={{ background: '#E0F2FE', color: '#0369A1', borderColor: '#7DD3FC' }}
                                          onClick={() => sendSMS(f.parent_mobile, getWhatsAppMessage(f, 'Reminder'), { student_id: f.student_id, category: 'Fee Reminder' })}
                                          title="Send SMS Reminder"
                                        >
                                          📱 SMS
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* SECTION B: PAID STUDENTS */}
                    <div>
                      <div style={{ padding: '16px 20px', background: 'var(--success-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          🟢 Successful Payments ({paidStudents.length})
                        </h4>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                          Confirmed payments for the cycle
                        </span>
                      </div>
                      {paidStudents.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: 13 }}>
                          No fully paid records recorded yet.
                        </div>
                      ) : (
                        <div className="table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Roll Number</th>
                                <th>Student Name</th>
                                <th>Class</th>
                                <th>Monthly Fee</th>
                                <th>Paid Amount</th>
                                <th>Payment Date</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paidStudents.map(f => (
                                <tr key={f.id}>
                                  <td><span className="badge badge-gray">{f.roll_number}</span></td>
                                  <td style={{ fontWeight: 600 }}>{f.student_name}</td>
                                  <td><span className="badge badge-info">{f.class_batch}</span></td>
                                  <td>₹{parseFloat(f.amount).toLocaleString()}</td>
                                  <td style={{ color: 'var(--success)', fontWeight: 700 }}>₹{parseFloat(f.paid_amount).toLocaleString()}</td>
                                  <td>
                                    {f.paid_date ? new Date(f.paid_date).toLocaleDateString() : 'Auto-Settled'} ({f.payment_mode || 'Cash'})
                                  </td>
                                  <td><span className="badge badge-success">Paid</span></td>
                                  <td style={{ textAlign: 'right' }}>
                                    <div className="action-group" style={{ justifyContent: 'flex-end' }}>
                                      <button
                                        className="call-btn"
                                        style={{ background: '#DCF8C6', color: '#075E54', borderColor: '#4FCE5D' }}
                                        onClick={() => sendWhatsApp(f.parent_mobile, getWhatsAppMessage(f, 'Receipt'), { student_id: f.student_id, category: 'Payment Receipt' })}
                                        title="Send WhatsApp Receipt"
                                      >
                                        💬 Receipt
                                      </button>
                                      <button
                                        className="call-btn"
                                        style={{ background: '#E0F2FE', color: '#0369A1', borderColor: '#7DD3FC' }}
                                        onClick={() => sendSMS(f.parent_mobile, getWhatsAppMessage(f, 'Receipt'), { student_id: f.student_id, category: 'Payment Receipt' })}
                                        title="Send SMS Receipt"
                                      >
                                        📱 SMS
                                      </button>
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* -------------------- MODAL: GENERATE MONTHLY FEE BILLS -------------------- */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generate Monthly Fee Bills</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Create billing cycles for a specific month/year. This will generate fee items for all active students who do not already have records for this month.
              </p>
              <form onSubmit={handleCreate}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Month</label>
                    <select className="form-select" value={createForm.month} onChange={e => setCreateForm(p => ({ ...p, month: e.target.value }))}>
                      {MONTHS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <input type="number" className="form-input" value={createForm.year} onChange={e => setCreateForm(p => ({ ...p, year: parseInt(e.target.value) || new Date().getFullYear() }))} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Default Amount (₹)</label>
                    <input type="number" className="form-input" value={createForm.amount} onChange={e => setCreateForm(p => ({ ...p, amount: e.target.value }))} required placeholder="e.g. 2000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="date" className="form-input" value={createForm.due_date} onChange={e => setCreateForm(p => ({ ...p, due_date: e.target.value }))} required />
                  </div>
                </div>
                <div className="modal-footer" style={{ padding: '16px 0 0', border: 'none', marginTop: 8 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Generate Bills</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: RECORD PAYMENT -------------------- */}
      {showPay && (
        <div className="modal-overlay" onClick={() => setShowPay(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Fee Payment — {showPay.student_name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPay(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handlePay}>
                <div className="form-group">
                  <label className="form-label">Amount Billed</label>
                  <input type="text" className="form-input" value={`₹${parseFloat(showPay.amount).toLocaleString()}`} disabled style={{ background: 'var(--border-light)', fontWeight: 'bold' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount Paying (₹)</label>
                  <input type="number" className="form-input" value={payForm.paid_amount} onChange={e => setPayForm(p => ({ ...p, paid_amount: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select className="form-select" value={payForm.payment_mode} onChange={e => setPayForm(p => ({ ...p, payment_mode: e.target.value }))}>
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Bank Transfer</option>
                    <option>Card</option>
                    <option>Cheque</option>
                  </select>
                </div>
                <div className="modal-footer" style={{ padding: '16px 0 0', border: 'none' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowPay(null)}>Cancel</button>
                  <button type="submit" className="btn btn-success">Record Payment</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: MASS REMINDERS AUDIT -------------------- */}
      {showRemind && (
        <div className="modal-overlay" onClick={() => setShowRemind(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔔 Dues Reminders Hub</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowRemind(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16, fontSize: 14 }}>List of students with outstanding dues across all billing periods ({pendingList.length}):</p>
              <div className="table-container" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>Billing Month</th>
                      <th>Outstanding Amount</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingList.map(f => {
                      const outstanding = parseFloat(f.amount) - parseFloat(f.paid_amount || 0);
                      return (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 600 }}>{f.student_name}</td>
                          <td><span className="badge badge-info">{f.class_batch}</span></td>
                          <td><b>{f.month} {f.year}</b></td>
                          <td style={{ color: 'var(--danger)', fontWeight: 600 }}>₹{outstanding.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="action-group" style={{ justifyContent: 'flex-end' }}>
                              <button
                                className="call-btn"
                                style={{ background: '#DCF8C6', color: '#075E54', borderColor: '#4FCE5D' }}
                                onClick={() => sendWhatsApp(f.parent_mobile, getWhatsAppMessage(f, 'Reminder'), { student_id: f.student_id, category: 'Fee Reminder' })}
                                title="Send WhatsApp Reminder"
                              >
                                💬 WhatsApp
                              </button>
                              <button
                                className="call-btn"
                                style={{ background: '#E0F2FE', color: '#0369A1', borderColor: '#7DD3FC' }}
                                onClick={() => sendSMS(f.parent_mobile, getWhatsAppMessage(f, 'Reminder'), { student_id: f.student_id, category: 'Fee Reminder' })}
                                title="Send SMS Reminder"
                              >
                                📱 SMS
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowRemind(false)}>Close Hub</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
