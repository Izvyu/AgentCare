import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CircularProgress } from '@mui/material';
import { api, unwrap } from './api';
import { actions } from './store';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function SessionGate({ children }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.app.user);
  const selectedCompany = useSelector((state) => state.app.selectedCompany);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/api/auth/session').then(unwrap).then((data) => {
      if (!active) return;
      const companies = data.companyInfo || [];
      const selected = companies.find((company) => company.comCode === selectedCompany?.comCode) || companies[0] || null;
      dispatch(actions.setSession({ user: data.user, companies, selectedCompany: selected }));
    }).catch(() => { if (active) dispatch(actions.clearSession()); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [dispatch]); // Recheck on navigation to the protected route, not on company selection.

  if (checking) return <div className="session-loading"><CircularProgress size={28} /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/Login" element={<LoginPage />} />
      <Route path="/dashboard" element={<SessionGate><DashboardPage /></SessionGate>} />
      <Route path="/Dashboard" element={<SessionGate><DashboardPage /></SessionGate>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
