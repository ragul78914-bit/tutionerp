import { useState, useEffect } from 'react';
import api from '../services/api';
import { sendWhatsApp, templates } from '../utils/communication';

export default function Marks() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal toggles
  const [showSubjectModal, setShowSubjectModal] = useState(null); // 'add' or subject object for edit
  const [showEnterMarks, setShowEnterMarks] = useState(null); // subject object

  // Inline results view
  const [activeResultsSubject, setActiveResultsSubject] = useState(null); // subject object
  const [resultsData, setResultsData] = useState({ results: [], rankings: [] });
  const [resultsLoading, setResultsLoading] = useState(false);

  // Forms
  const [subjectForm, setSubjectForm] = useState({ name: '', class_batch: '', exam_date: '', max_marks: 100, description: '' });
  const [marksData, setMarksData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [resultsSearch, setResultsSearch] = useState('');

  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [s, st] = await Promise.all([api.getSubjects(), api.getStudentStats()]);
      setSubjects(s);
      setClasses(st.classes || []);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Open Add/Edit Subject Modal
  const openSubjectModal = (mode, subj = null) => {
    if (mode === 'edit' && subj) {
      // Format date to YYYY-MM-DD for input date element
      const formattedDate = subj.exam_date ? new Date(subj.exam_date).toISOString().split('T')[0] : '';
      setSubjectForm({
        id: subj.id,
        name: subj.name,
        class_batch: subj.class_batch || '',
        exam_date: formattedDate,
        max_marks: subj.max_marks,
        description: subj.description || ''
      });
      setShowSubjectModal(subj);
    } else {
      setSubjectForm({ name: '', class_batch: '', exam_date: '', max_marks: 100, description: '' });
      setShowSubjectModal('add');
    }
  };

  // Handle Add/Edit Subject Submit
  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    try {
      if (showSubjectModal === 'add') {
        await api.addSubject(subjectForm);
        showToast('success', 'Subject created successfully!');
      } else {
        await api.updateSubject(subjectForm.id, subjectForm);
        showToast('success', 'Subject updated successfully!');
      }
      setShowSubjectModal(null);
      fetchData();
      if (activeResultsSubject && activeResultsSubject.id === subjectForm.id) {
        // Refresh active result view details
        const updatedSubj = await api.getSubjects().then(list => list.find(x => x.id === subjectForm.id));
        if (updatedSubj) {
          setActiveResultsSubject(updatedSubj);
          viewResults(updatedSubj);
        }
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // Delete Subject
  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject and all its student marks entries?')) return;
    try {
      await api.deleteSubject(id);
      showToast('success', 'Subject deleted.');
      if (activeResultsSubject && activeResultsSubject.id === id) {
        setActiveResultsSubject(null);
      }
      fetchData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // Open Enter Marks Modal
  const openEnterMarksModal = async (subject) => {
    try {
      const studs = await api.getStudents(`class_batch=${subject.class_batch}&status=Active`);
      setStudents(studs);

      // Fetch current marks to prepopulate
      const currentRes = await api.getSubjectResults(subject.id);
      const existingMarks = currentRes.results || [];

      const initial = studs.map(s => {
        const existing = existingMarks.find(em => em.student_id === s.id);
        const marksObtained = existing ? existing.marks_obtained : '';
        const maxMarks = subject.max_marks;
        const percentage = marksObtained !== '' ? ((parseFloat(marksObtained) / parseFloat(maxMarks)) * 100) : 0;
        const grade = marksObtained !== '' ? (percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : percentage >= 35 ? 'E' : 'F') : '-';
        const status = marksObtained !== '' ? (percentage >= 35 ? 'Pass' : 'Fail') : '-';

        return {
          student_id: s.id,
          student_name: s.name,
          roll_number: s.roll_number,
          marks_obtained: marksObtained,
          percentage: marksObtained !== '' ? percentage.toFixed(1) : '-',
          grade,
          status
        };
      });

      setMarksData(initial);
      setShowEnterMarks(subject);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // Update specific student mark in array
  const updateStudentMark = (idx, val) => {
    setMarksData(prev => {
      const updated = [...prev];
      const maxMarks = showEnterMarks.max_marks;
      const obtained = val !== '' ? parseFloat(val) : '';
      
      let pct = '-';
      let gr = '-';
      let stat = '-';

      if (obtained !== '') {
        const calculatedPct = (obtained / maxMarks) * 100;
        pct = calculatedPct.toFixed(1);
        gr = calculatedPct >= 90 ? 'A+' : calculatedPct >= 80 ? 'A' : calculatedPct >= 70 ? 'B' : calculatedPct >= 60 ? 'C' : calculatedPct >= 50 ? 'D' : calculatedPct >= 35 ? 'E' : 'F';
        stat = calculatedPct >= 35 ? 'Pass' : 'Fail';
      }

      updated[idx] = {
        ...updated[idx],
        marks_obtained: val,
        percentage: pct,
        grade: gr,
        status: stat
      };
      return updated;
    });
  };

  // Submit bulk marks
  const handleSubmitMarks = async () => {
    // Filter and format only rows with entered marks
    const validMarks = marksData
      .filter(m => m.marks_obtained !== '')
      .map(m => ({
        student_id: m.student_id,
        marks_obtained: parseFloat(m.marks_obtained)
      }));

    if (validMarks.length === 0) {
      showToast('error', 'Enter at least one mark to save');
      return;
    }

    try {
      await api.enterMarks({
        subject_id: showEnterMarks.id,
        marks: validMarks
      });
      showToast('success', 'Marks saved successfully!');
      setShowEnterMarks(null);
      fetchData();
      if (activeResultsSubject && activeResultsSubject.id === showEnterMarks.id) {
        viewResults(showEnterMarks);
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // View Results view
  const viewResults = async (subject) => {
    try {
      setResultsLoading(true);
      setActiveResultsSubject(subject);
      const res = await api.getSubjectResults(subject.id);
      setResultsData(res);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setResultsLoading(false);
    }
  };

  // Send single student WhatsApp result
  const handleSendWhatsAppResult = async (studentId, studentName, rollNumber) => {
    try {
      const res = await api.getStudentMarks(studentId);
      if (res.length === 0) {
        showToast('error', 'No marks found for this student to send');
        return;
      }

      // Fetch student details to get parent mobile
      const stud = await api.getStudent(studentId);

      const marksLines = res.map(m => `${m.subject_name}: ${m.marks_obtained}/${m.max_marks}`).join('\n');
      const totalObtained = res.reduce((sum, m) => sum + parseFloat(m.marks_obtained), 0);
      const totalMax = res.reduce((sum, m) => sum + parseFloat(m.max_marks), 0);
      const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
      const status = overallPct >= 35 ? 'PASS' : 'FAIL';

      const message = `Student: ${studentName} (Roll No: ${rollNumber})\nClass: ${stud.class_batch}\n\n${marksLines}\n\nOverall Percentage: ${overallPct}%\nStatus: ${status}`;

      sendWhatsApp(stud.parent_mobile, message, { student_id: studentId, category: 'Marks' });
      showToast('success', 'Redirecting to WhatsApp...');
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // Delete single student's mark
  const handleDeleteMark = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student\'s mark?')) return;
    try {
      await api.deleteMark(activeResultsSubject.id, studentId);
      showToast('success', 'Mark entry deleted.');
      viewResults(activeResultsSubject);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // Calculations for stats
  const getStats = () => {
    const scores = resultsData.rankings || [];
    if (scores.length === 0) return { highest: '-', average: '-', passRate: '-' };

    const max = Math.max(...scores.map(s => parseFloat(s.marks_obtained)));
    const total = scores.reduce((sum, s) => sum + parseFloat(s.marks_obtained), 0);
    const avg = (total / scores.length).toFixed(1);
    const passes = scores.filter(s => s.status === 'Pass').length;
    const rate = ((passes / scores.length) * 100).toFixed(0);

    return {
      highest: `${max}/${activeResultsSubject.max_marks}`,
      average: `${avg}/${activeResultsSubject.max_marks} (${((avg / activeResultsSubject.max_marks) * 100).toFixed(0)}%)`,
      passRate: `${rate}%`
    };
  };

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = classFilter === '' || s.class_batch === classFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredResults = (resultsData.rankings || []).filter(r => 
    r.student_name.toLowerCase().includes(resultsSearch.toLowerCase()) || 
    r.roll_number.toLowerCase().includes(resultsSearch.toLowerCase())
  );

  return (
    <div>
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}

      {/* -------------------- VIEW 1: SUBJECTS DASHBOARD -------------------- */}
      {!activeResultsSubject ? (
        <div>
          <div className="page-header">
            <div>
              <h2>Subject Management & Exams</h2>
              <p>Add exams, define subject attributes, enter scores, and audit class performance</p>
            </div>
            <button className="btn btn-primary" onClick={() => openSubjectModal('add')}>+ Add Subject</button>
          </div>

          {/* Search & Filter Bar */}
          <div className="card" style={{ marginBottom: 24, padding: 16 }}>
            <div className="filter-bar" style={{ margin: 0, justifyContent: 'space-between' }}>
              <div className="search-bar" style={{ flex: 1, minWidth: 260 }}>
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="form-select"
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                style={{ width: 'auto', minWidth: 180 }}
              >
                <option value="">All Classes/Batches</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : filteredSubjects.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <h3>No Subjects Found</h3>
                <p>Create a subject to begin recording exams and managing student scores.</p>
                <button className="btn btn-primary" onClick={() => openSubjectModal('add')}>Add New Subject</button>
              </div>
            </div>
          ) : (
            <div className="grid-3">
              {filteredSubjects.map(s => (
                <div className="card" key={s.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="card-header" style={{ padding: '18px 20px', background: 'var(--border-light)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className="badge badge-info" style={{ alignSelf: 'flex-start' }}>{s.class_batch}</span>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '4px 0 0' }}>{s.name}</h3>
                    </div>
                    <div className="action-group">
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openSubjectModal('edit', s)}>✏️</button>
                      <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteSubject(s.id)}>🗑️</button>
                    </div>
                  </div>
                  <div className="card-body" style={{ flex: 1, padding: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span>📅</span>
                        <span>Exam Date: <b>{s.exam_date ? new Date(s.exam_date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Not Scheduled'}</b></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span>🎯</span>
                        <span>Maximum Marks: <b>{s.max_marks} Marks</b></span>
                      </div>
                      {s.description && (
                        <p style={{ fontSize: 13, color: 'var(--text-light)', borderLeft: '3px solid var(--border)', paddingLeft: 8, marginTop: 4 }}>
                          {s.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="card-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 10 }}>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEnterMarksModal(s)}>✏️ Enter Marks</button>
                    <button className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => viewResults(s)}>📊 View Results</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* -------------------- VIEW 2: SUBJECT RESULTS VIEW -------------------- */
        <div>
          <div className="page-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="badge badge-info">{activeResultsSubject.class_batch}</span>
                <span style={{ color: 'var(--text-light)' }}>•</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  📅 Exam: {activeResultsSubject.exam_date ? new Date(activeResultsSubject.exam_date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '-'}
                </span>
              </div>
              <h2 style={{ marginTop: 6 }}>{activeResultsSubject.name} — Performance Audit</h2>
            </div>
            <button className="btn btn-outline" onClick={() => { setActiveResultsSubject(null); setResultsSearch(''); }}>
              ← Back to Subjects
            </button>
          </div>

          {resultsLoading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <div>
              {/* Statistic Cards */}
              <div className="stats-grid">
                <div className="stat-card blue">
                  <div className="stat-icon blue">🎓</div>
                  <div className="stat-value">{(resultsData.rankings || []).length}</div>
                  <div className="stat-label">Students Evaluated</div>
                </div>
                <div className="stat-card green">
                  <div className="stat-icon green">🏆</div>
                  <div className="stat-value">{getStats().highest}</div>
                  <div className="stat-label">Highest Marks</div>
                </div>
                <div className="stat-card orange">
                  <div className="stat-icon orange">📊</div>
                  <div className="stat-value" style={{ fontSize: 18, height: 42, display: 'flex', alignItems: 'center' }}>
                    {getStats().average}
                  </div>
                  <div className="stat-label">Class Average Score</div>
                </div>
                <div className="stat-card green">
                  <div className="stat-icon green">✅</div>
                  <div className="stat-value">{getStats().passRate}</div>
                  <div className="stat-label">Passing rate ( &ge; 35% )</div>
                </div>
              </div>

              {/* Result Table Container */}
              <div className="card">
                <div className="card-header" style={{ padding: '16px 22px' }}>
                  <h3 style={{ fontSize: 15 }}>Result Rankings</h3>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div className="search-bar" style={{ minWidth: 240 }}>
                      <span className="search-icon">🔍</span>
                      <input
                        type="text"
                        placeholder="Search student or roll number..."
                        value={resultsSearch}
                        onChange={e => setResultsSearch(e.target.value)}
                        style={{ padding: '7px 12px 7px 34px', fontSize: 13 }}
                      />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => openEnterMarksModal(activeResultsSubject)}>
                      ✏️ Edit Marks
                    </button>
                  </div>
                </div>

                {filteredResults.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <h3>No Marks Entered Yet</h3>
                    <p>Click "Edit Marks" above to enter scores for students in this batch.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Roll Number</th>
                          <th>Student Name</th>
                          <th>Subject</th>
                          <th>Marks Obtained</th>
                          <th>Total Marks</th>
                          <th>Percentage</th>
                          <th>Grade</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.map(r => (
                          <tr key={r.student_id}>
                            <td>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 28, height: 28, borderRadius: '50%', fontWeight: 700, fontSize: 13,
                                background: r.rank === 1 ? '#FEF3C7' : r.rank === 2 ? '#F1F5F9' : r.rank === 3 ? '#FED7AA' : 'var(--bg-dark)',
                                color: r.rank === 1 ? '#92400E' : r.rank === 2 ? '#475569' : r.rank === 3 ? '#9A3412' : 'var(--text-secondary)'
                              }}>
                                {r.rank}
                              </span>
                            </td>
                            <td><span className="badge badge-gray">{r.roll_number}</span></td>
                            <td style={{ fontWeight: 600 }}>{r.student_name}</td>
                            <td>{r.subject_name}</td>
                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{parseFloat(r.marks_obtained)}</td>
                            <td>{r.max_marks}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 6, background: 'var(--bg-dark)', borderRadius: 3, overflow: 'hidden', minWidth: 50, maxWidth: 80 }}>
                                  <div style={{
                                    width: `${r.percentage}%`, height: '100%', borderRadius: 3,
                                    background: parseFloat(r.percentage) >= 75 ? 'var(--success)' : parseFloat(r.percentage) >= 35 ? 'var(--warning)' : 'var(--danger)'
                                  }}></div>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700 }}>{r.percentage}%</span>
                              </div>
                            </td>
                            <td><b style={{ fontSize: 13 }}>{r.grade}</b></td>
                            <td>
                              <span className={`badge badge-${r.status === 'Pass' ? 'success' : 'danger'}`}>
                                {r.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-group" style={{ justifyContent: 'flex-end' }}>
                                <button
                                  className="call-btn"
                                  style={{ background: '#DCF8C6', color: '#075E54', borderColor: '#4FCE5D' }}
                                  onClick={() => handleSendWhatsAppResult(r.student_id, r.student_name, r.roll_number)}
                                  title="Send Report Card via WhatsApp"
                                >
                                  💬 Send Result
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--danger)', padding: 6 }}
                                  onClick={() => handleDeleteMark(r.student_id)}
                                >
                                  🗑️
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
      )}

      {/* -------------------- MODAL: ADD / EDIT SUBJECT -------------------- */}
      {showSubjectModal && (
        <div className="modal-overlay" onClick={() => setShowSubjectModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{showSubjectModal === 'add' ? 'Create Exam Subject' : 'Edit Subject Details'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowSubjectModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSubjectSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Subject Name</label>
                  <input
                    className="form-input"
                    value={subjectForm.name}
                    onChange={e => setSubjectForm(p => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="e.g. Mathematics, Science, English"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Class/Batch</label>
                    <select
                      className="form-select"
                      value={subjectForm.class_batch}
                      onChange={e => setSubjectForm(p => ({ ...p, class_batch: e.target.value }))}
                      required
                    >
                      <option value="">Select Class</option>
                      {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Maximum Marks</label>
                    <input
                      type="number"
                      className="form-input"
                      value={subjectForm.max_marks}
                      onChange={e => setSubjectForm(p => ({ ...p, max_marks: parseInt(e.target.value) || 0 }))}
                      required
                      min="1"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Exam Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={subjectForm.exam_date}
                    onChange={e => setSubjectForm(p => ({ ...p, exam_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description (optional)</label>
                  <textarea
                    className="form-textarea"
                    value={subjectForm.description}
                    onChange={e => setSubjectForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Provide syllabus chapters, schedule or specific instructions..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowSubjectModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {showSubjectModal === 'add' ? 'Create Subject' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: ENTER / UPDATE MARKS (BULK) -------------------- */}
      {showEnterMarks && (
        <div className="modal-overlay" onClick={() => setShowEnterMarks(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 880, maxHeight: '90vh' }}>
            <div className="modal-header" style={{ padding: '16px 24px' }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: 4 }}>{showEnterMarks.class_batch}</span>
                <h3 style={{ margin: 0 }}>Score Sheet: {showEnterMarks.name}</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEnterMarks(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: 0 }}>
              {students.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <p>No active students registered for <b>{showEnterMarks.class_batch}</b></p>
                </div>
              ) : (
                <table className="data-table">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th style={{ width: 140 }}>Marks Obtained</th>
                      <th>Total Marks</th>
                      <th>Percentage</th>
                      <th>Grade</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksData.map((m, i) => (
                      <tr key={m.student_id}>
                        <td><span className="badge badge-gray">{m.roll_number}</span></td>
                        <td style={{ fontWeight: 600 }}>{m.student_name}</td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: 13, border: '2px solid var(--border)' }}
                            value={m.marks_obtained}
                            onChange={e => updateStudentMark(i, e.target.value)}
                            placeholder="Score"
                            min="0"
                            max={showEnterMarks.max_marks}
                            step="0.5"
                          />
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}><b>/ {showEnterMarks.max_marks}</b></td>
                        <td style={{ fontWeight: 700 }}>
                          {m.percentage !== '-' ? `${m.percentage}%` : '-'}
                        </td>
                        <td><b>{m.grade}</b></td>
                        <td>
                          {m.status !== '-' ? (
                            <span className={`badge badge-${m.status === 'Pass' ? 'success' : 'danger'}`}>
                              {m.status}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowEnterMarks(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmitMarks} disabled={students.length === 0}>
                💾 Save Marks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
