import { useState } from 'react';
import { Avatar, Box, IconButton, Menu, MenuItem, Popover, Switch, Toolbar, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useIntl } from 'react-intl';
import NotificationPlaceholder from './NotificationPlaceholder';

export default function TopBar({ user, tabs, selectedTab, sidebarOpen, mobileSidebarOpen, isMobile, onToggleSidebar, onSelectTab, onCloseTab, onCloseOthers, onCloseAll, onReorder, dark, onToggleDark, locale, onLocaleChange, onChangePassword }) {
  const intl = useIntl();
  const [dragIndex, setDragIndex] = useState(null);
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [userAnchor, setUserAnchor] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const displayName = user?.name || user?.Name || user?.account || user?.Account || 'AgentCare User';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'R';
  const toggleLabel = isMobile ? (mobileSidebarOpen ? 'closeSidebar' : 'openSidebar') : (sidebarOpen ? 'closeSidebar' : 'openSidebar');

  return (
    <Box component="header" className="topbar">
      <Toolbar className="topbar-toolbar">
        {(isMobile || !sidebarOpen) && <IconButton className="topbar-sidebar-toggle" onClick={onToggleSidebar} aria-label={intl.formatMessage({ id: toggleLabel })}><MenuIcon /></IconButton>}
        <Box className="topbar-tabs" role="tablist">
          {tabs.map((tab, index) => {
            const isHome = tab.id === 'home';
            const selected = selectedTab === tab.id;
            return <Box
              key={tab.id}
              className={`topbar-tab ${selected ? 'active' : ''} ${isHome ? 'home-tab' : ''}`}
              role="tab"
              aria-selected={selected}
              draggable={!isHome}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => { if (dragIndex !== null && dragIndex !== index) onReorder(dragIndex, index); setDragIndex(null); }}
              onClick={() => onSelectTab(tab.id)}
              title={tab.label}
            >
              <Typography component="span" className="topbar-tab-label">{isHome ? <HomeOutlinedIcon className="topbar-home-icon" fontSize="small" /> : tab.label}</Typography>
              {!isHome && <IconButton size="small" className="topbar-tab-close" aria-label={`${intl.formatMessage({ id: 'closeTab' })} ${tab.label}`} onClick={(event) => { event.stopPropagation(); onCloseTab(tab.id); }}><CloseIcon fontSize="inherit" /></IconButton>}
            </Box>;
          })}
        </Box>
        <Box className="topbar-spacer" />
        <Tooltip title={intl.formatMessage({ id: 'closeOthers' })}><IconButton aria-label={intl.formatMessage({ id: 'closeOthers' })} onClick={(event) => setSettingsAnchor(event.currentTarget)}><SettingsOutlinedIcon fontSize="small" /></IconButton></Tooltip>
        <Popover anchorEl={settingsAnchor} open={Boolean(settingsAnchor)} onClose={() => setSettingsAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <MenuItem onClick={() => { onCloseOthers(); setSettingsAnchor(null); }}>{intl.formatMessage({ id: 'closeOthers' })}</MenuItem>
          <MenuItem onClick={() => { onCloseAll(); setSettingsAnchor(null); }}>{intl.formatMessage({ id: 'closeAll' })}</MenuItem>
        </Popover>
        <Tooltip title={intl.formatMessage({ id: 'notifications' })}><IconButton onClick={(event) => setNotificationAnchor(event.currentTarget)}><NotificationsNoneOutlinedIcon /></IconButton></Tooltip>
        <Popover anchorEl={notificationAnchor} open={Boolean(notificationAnchor)} onClose={() => setNotificationAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><NotificationPlaceholder /></Popover>
        <Box className="topbar-user" component="button" type="button" onClick={(event) => setUserAnchor(event.currentTarget)} aria-label="user menu">
          <Avatar className="user-avatar">{initial}</Avatar>
          <Typography className="topbar-user-name" component="span">{displayName}</Typography>
        </Box>
        <Menu anchorEl={userAnchor} open={Boolean(userAnchor)} onClose={() => setUserAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <MenuItem onClick={onToggleDark}>{dark ? <DarkModeOutlinedIcon fontSize="small" /> : <LightModeOutlinedIcon fontSize="small" />}<span className="menu-item-text">{intl.formatMessage({ id: dark ? 'darkMode' : 'lightMode' })}</span><Switch checked={dark} size="small" onChange={onToggleDark} /></MenuItem>
          <MenuItem><LanguageOutlinedIcon fontSize="small" /><span className="menu-item-text">{intl.formatMessage({ id: 'language' })}</span><select className="menu-locale-select" value={locale} onChange={(event) => onLocaleChange(event.target.value)}><option value="zh-tw">繁體中文</option><option value="en">English</option></select></MenuItem>
          <MenuItem onClick={() => { setUserAnchor(null); onChangePassword(); }}>{intl.formatMessage({ id: 'changePassword' })}</MenuItem>
        </Menu>
      </Toolbar>
    </Box>
  );
}
