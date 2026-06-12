import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

export default function StudentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', gender: 'Boy', class_batch: '', parent_name: '',
    parent_mobile: '', address: '', admission_date: new Date().toISOString().split('T')[0], status: 'Active'
  });

  useEffect(() => {
    if (isEdit) {
      api.getStudent(id).then(s => setForm({
        name: s.name, gender: s.gender, class_batch: s.class_batch,
        parent_name: s.parent_name, parent_mobile: s.parent_mobile,
        address: s.address || '', admission_date: s.admission_date?.split('T')[0] || '', status: s.status
      })).catch(err => { alert(err.message); navigate('/students'); });
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) { await api.updateStudent(id, form); }
      else { await api.addStudent(form); }
      navigate('/students');
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div>
      <div className="page-header">
        <div><h2>{isEdit ? 'Edit Student' : 'Add New Student'}</h2><p>Fill in the student details below</p></div>
        <button className="btn btn-outline" onClick={() => navigate('/students')}>← Back</button>
      </div>
      <div className="card" style={{ maxWidth: 720 }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Student Name *</label>
                <input className="form-input" value={form.name} onChange={e => update('name', e.target.value)} required placeholder="Enter student name" />
              </div>
              <div className="form-group">
                <label className="form-label">Gender *</label>
                <select className="form-select" value={form.gender} onChange={e => update('gender', e.target.value)}>
                  <option value="Boy">Boy</option>
                  <option value="Girl">Girl</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Class / Batch *</label>
                <input className="form-input" value={form.class_batch} onChange={e => update('class_batch', e.target.value)} required placeholder="e.g. Class 10, Batch A" />
              </div>
              <div className="form-group">
                <label className="form-label">Admission Date *</label>
                <input type="date" className="form-input" value={form.admission_date} onChange={e => update('admission_date', e.target.value)} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Parent Name *</label>
                <input className="form-input" value={form.parent_name} onChange={e => update('parent_name', e.target.value)} required placeholder="Enter parent name" />
              </div>
              <div className="form-group">
                <label className="form-label">Parent Mobile *</label>
                <input className="form-input" value={form.parent_mobile} onChange={e => update('parent_mobile', e.target.value)} required placeholder="+91 9876543210" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-textarea" value={form.address} onChange={e => update('address', e.target.value)} placeholder="Enter student address" />
            </div>
            {isEdit && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => update('status', e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? 'Saving...' : (isEdit ? 'Update Student' : 'Add Student')}
              </button>
              <button type="button" className="btn btn-outline btn-lg" onClick={() => navigate('/students')}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
