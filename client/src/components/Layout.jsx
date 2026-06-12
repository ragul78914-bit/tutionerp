import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { section: 'Main', items: [
    { path: '/', label: 'Dashboard', icon: '📊' },
  ]},
  { section: 'Management', items: [
    { path: '/students', label: 'Students', icon: '🎓' },
    { path: '/attendance', label: 'Attendance', icon: '📋' },
    { path: '/attendance/history', label: 'Attendance Report', icon: '📅' },
    { path: '/fees', label: 'Fees', icon: '💰' },
    { path: '/fees/report', label: 'Fee Report', icon: '📈' },
    { path: '/marks', label: 'Subject Marks', icon: '📝' },
  ]},
  { section: 'Communication', items: [
    { path: '/notifications', label: 'Notifications', icon: '🔔' },
  ]},
  { section: 'System', items: [
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ]},
];

const pageTitles = {
  '/': 'Dashboard',
  '/students': 'Students',
  '/students/add': 'Add Student',
  '/attendance': 'Mark Attendance',
  '/attendance/history': 'Attendance Report',
  '/fees': 'Fee Management',
  '/fees/report': 'Fee Report',
  '/marks': 'Subject Marks',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

export default function Layout() {
  const { admin, logout } = useAuth();
  const location = useLocation();

  const currentTitle = pageTitles[location.pathname] || 'Tuition ERP';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">T</div>
          <div>
            <div className="sidebar-title">Tuition ERP</div>
            <div className="sidebar-subtitle">Management System</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((section, si) => (
            <div key={si}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
          <div className="nav-section-title">Account</div>
          <button className="nav-item" onClick={logout}>
            <span className="nav-icon">🚪</span>
            Logout
          </button>
        </nav>
      </aside>

      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <h1>{currentTitle}</h1>
          </div>
          <div className="header-right">
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{admin?.name}</span>
            <div className="header-avatar">{admin?.name?.charAt(0) || 'A'}</div>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
