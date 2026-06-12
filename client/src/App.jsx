import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentForm from './pages/StudentForm';
import StudentProfile from './pages/StudentProfile';
import Attendance from './pages/Attendance';
import AttendanceHistory from './pages/AttendanceHistory';
import Fees from './pages/Fees';
import FeeReport from './pages/FeeReport';
import Marks from './pages/Marks';

import Notifications from './pages/Notifications';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!admin) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  const { admin, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <Routes>
      <Route path="/login" element={admin ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/add" element={<StudentForm />} />
        <Route path="students/edit/:id" element={<StudentForm />} />
        <Route path="students/:id" element={<StudentProfile />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="attendance/history" element={<AttendanceHistory />} />
        <Route path="fees" element={<Fees />} />
        <Route path="fees/report" element={<FeeReport />} />
        <Route path="marks" element={<Marks />} />

        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
