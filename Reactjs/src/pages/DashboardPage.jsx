import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Snackbar } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { actions } from '../store';
import { api, unwrap } from '../api';
import { resolveComponent } from '../_Services';
import ChangePasswordDialog from '../components/ChangePasswordDialog';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import './DashboardPage.css';
import '../components/dashboard/Sidebar.css';
import '../components/dashboard/TopBar.css';

export const HOME_TAB = { id: 'home', label: 'Home', functionName: 'Home', componentName: 'Home', sideMenuID: '', auth: null };
const MOBILE_NAV_BREAKPOINT = 768;

export default function DashboardPage() {
  const intl = useIntl();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, companies, selectedCompany, menu, locale, dark } = useSelector((state) => state.app);
  const [tabs, setTabs] = useState([HOME_TAB]);
  const [selectedTab, setSelectedTab] = useState(HOME_TAB.id);
  const [menuItems, setMenuItems] = useState(menu || []);
  const [menuSearchItems, setMenuSearchItems] = useState([]);
  const [menuStatus, setMenuStatus] = useState('loading');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileNav, setIsMobileNav] = useState(() => typeof window !== 'undefined' && window.innerWidth < MOBILE_NAV_BREAKPOINT);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const handleSidebarToggle = useCallback(() => {
    if (isMobileNav) {
      setMobileSidebarOpen((current) => !current);
      return;
    }
    setSidebarOpen((current) => !current);
  }, [isMobileNav]);

  useEffect(() => {
    const handleResize = () => setIsMobileNav(window.innerWidth < MOBILE_NAV_BREAKPOINT);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileNav) setMobileSidebarOpen(false);
  }, [isMobileNav]);

  const loadMenu = useCallback(async () => {
    const roleId = Number(user?.roleID ?? user?.RoleID ?? 0);
    if (!roleId) {
      setMenuItems([]);
      setMenuSearchItems([]);
      setMenuStatus('success');
      return;
    }
    setMenuStatus('loading');
    try {
      const data = await unwrap(await api.post('/api/auth/side-menu', { roleID: roleId, languageKey: locale }));
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      setMenuItems(rows);
      setMenuSearchItems(Array.isArray(data?.rows2) ? data.rows2 : []);
      dispatch(actions.setMenu(rows));
      setMenuStatus('success');
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        dispatch(actions.clearSession());
        navigate('/login', { replace: true });
        return;
      }
      setMenuStatus('error');
    }
  }, [dispatch, user, locale, navigate]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  const logout = async () => {
    try { await api.post('/api/auth/logout'); } catch { /* the local session is still cleared */ }
    dispatch(actions.clearSession());
    navigate('/login', { replace: true });
  };

  const changeCompany = async (company) => {
    try {
      const context = await unwrap(await api.get('/api/auth/session'));
      const authorized = (context.companyInfo || []).find((item) => item.comCode === company.comCode);
      if (!authorized) throw new Error(intl.formatMessage({ id: 'companyNotAuthorized' }));
      dispatch(actions.setSession({ user: context.user, companies: context.companyInfo, selectedCompany: authorized }));
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        dispatch(actions.clearSession());
        navigate('/login', { replace: true });
        return;
      }
      setNotice({ message: intl.formatMessage({ id: 'companySwitchFailed' }), severity: 'error' });
    }
  };

  const openTab = (item) => {
    const functionName = item.functionName || '';
    const componentName = item.componentName || '';
    const tabKey = item.sideMenuID || functionName || componentName || `menu-${Date.now()}`;
    const nextTab = { id: `tab-${tabKey}`, label: item.labelTranslation || item.label || functionName || componentName || intl.formatMessage({ id: 'placeholder' }), functionName, componentName, sideMenuID: item.sideMenuID || '', auth: item.auth || null };
    setTabs((current) => current.some((tab) => tab.id === nextTab.id) ? current : [...current, nextTab]);
    setSelectedTab(nextTab.id);
  };

  const closeTab = (id) => {
    if (id === HOME_TAB.id) return;
    setTabs((current) => {
      const index = current.findIndex((tab) => tab.id === id);
      const next = current.filter((tab) => tab.id !== id);
      if (selectedTab === id) setSelectedTab((next[Math.max(0, index - 1)] || HOME_TAB).id);
      return next;
    });
  };

  const closeOthers = () => {
    setTabs((current) => {
      const active = current.find((tab) => tab.id === selectedTab);
      return active && active.id !== HOME_TAB.id ? [HOME_TAB, active] : [HOME_TAB];
    });
  };

  const closeAll = () => { setTabs([HOME_TAB]); setSelectedTab(HOME_TAB.id); };

  const reorderTabs = (from, to) => {
    if (from === 0 || to === 0) return;
    setTabs((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === selectedTab) || HOME_TAB, [selectedTab, tabs]);
  const ActiveComponent = resolveComponent(activeTab.componentName || activeTab.functionName);

  return (
    <Box className="dashboard-shell">
      <Sidebar isMobile={isMobileNav} open={sidebarOpen} mobileOpen={mobileSidebarOpen} companies={companies} selectedCompany={selectedCompany} menuItems={menuItems} menuSearchItems={menuSearchItems} menuStatus={menuStatus} onRetry={loadMenu} onCompanyChange={changeCompany} onMenuItemClick={openTab} onCloseMobile={closeMobileSidebar} onToggle={handleSidebarToggle} onLogout={logout} />
      <Box className="dashboard-main-wrapper">
        <TopBar user={user} tabs={tabs} selectedTab={selectedTab} sidebarOpen={sidebarOpen} mobileSidebarOpen={mobileSidebarOpen} isMobile={isMobileNav} onToggleSidebar={handleSidebarToggle} onSelectTab={setSelectedTab} onCloseTab={closeTab} onCloseOthers={closeOthers} onCloseAll={closeAll} onReorder={reorderTabs} dark={dark} onToggleDark={() => dispatch(actions.setDark(!dark))} locale={locale} onLocaleChange={(value) => dispatch(actions.setLocale(value))} onChangePassword={() => setPasswordOpen(true)} />
        <Box component="main" className="dashboard-content">
          {menuStatus === 'error' && <Alert severity="warning" action={<button className="inline-retry" type="button" onClick={loadMenu}>{intl.formatMessage({ id: 'retry' })}</button>} sx={{ mb: 2 }}>{intl.formatMessage({ id: 'menuLoadFailed' })}</Alert>}
          <ActiveComponent title={activeTab.label} menuItem={activeTab} />
        </Box>
      </Box>
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} onSuccess={(message) => setNotice({ message, severity: 'success' })} />
      <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice(null)}><Alert severity={notice?.severity || 'info'} onClose={() => setNotice(null)}>{notice?.message}</Alert></Snackbar>
    </Box>
  );
}
