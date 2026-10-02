import { useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Collapse, Divider, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Skeleton, TextField, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DomainOutlinedIcon from '@mui/icons-material/DomainOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import SearchIcon from '@mui/icons-material/Search';
import { useIntl } from 'react-intl';

function flatten(items) {
  return items.reduce((result, item) => {
    if (item.functionName || item.componentName) result.push(item);
    if (item.children?.length) result.push(...flatten(item.children));
    return result;
  }, []);
}

function itemLabel(item) {
  return item.labelTranslation || item.label || item.functionName || item.componentName || 'Menu';
}

export function highlightSearchText(label, query) {
  const text = String(label ?? '');
  const keyword = String(query ?? '').trim();
  if (!keyword) return text;

  const lowerText = text.toLocaleLowerCase();
  const lowerKeyword = keyword.toLocaleLowerCase();
  const parts = [];
  let cursor = 0;
  let matchIndex = lowerText.indexOf(lowerKeyword, cursor);

  while (matchIndex !== -1) {
    if (matchIndex > cursor) parts.push({ text: text.slice(cursor, matchIndex), highlight: false });
    parts.push({ text: text.slice(matchIndex, matchIndex + keyword.length), highlight: true });
    cursor = matchIndex + keyword.length;
    matchIndex = lowerText.indexOf(lowerKeyword, cursor);
  }

  if (!parts.length) return text;
  if (cursor < text.length) parts.push({ text: text.slice(cursor), highlight: false });
  return parts.map((part, index) => (
    <span key={`${part.text}-${index}`} style={part.highlight ? { color: '#4caf50', fontWeight: 700 } : undefined}>
      {part.text}
    </span>
  ));
}

function MenuNode({ item, open, level = 0, expanded, onToggle, onSelect }) {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const id = item.sideMenuID || item.functionName || item.componentName || itemLabel(item);
  const isExpanded = expanded.has(id);

  return (
    <Box className="menu-item-wrapper">
      <ListItemButton
        className={`sidebar-menu-item ${level > 0 ? 'sidebar-submenu-item' : ''}`}
        sx={{ pl: 2 + level * 1.7, justifyContent: open ? 'initial' : 'center' }}
        onClick={() => (hasChildren ? onToggle(id) : onSelect(item))}
        title={!open ? itemLabel(item) : undefined}
      >
        <ListItemIcon sx={{ minWidth: open ? 34 : 0, justifyContent: 'center' }}><FolderOutlinedIcon fontSize="small" /></ListItemIcon>
        {open && <ListItemText primary={itemLabel(item)} primaryTypographyProps={{ noWrap: true, fontSize: 14 }} />}
        {open && hasChildren && (isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />)}
      </ListItemButton>
      {hasChildren && <Collapse in={isExpanded} timeout="auto" unmountOnExit><List disablePadding>{item.children.map((child) => <MenuNode key={child.sideMenuID || child.functionName || child.componentName} item={child} open={open} level={level + 1} expanded={expanded} onToggle={onToggle} onSelect={onSelect} />)}</List></Collapse>}
    </Box>
  );
}

export default function Sidebar({ isMobile, open, mobileOpen, companies, selectedCompany, menuItems, menuSearchItems, menuStatus, onRetry, onCompanyChange, onMenuItemClick, onCloseMobile, onToggle, onLogout }) {
  const intl = useIntl();
  const [searchInput, setSearchInput] = useState('');
  const [expanded, setExpanded] = useState(new Set());
  const searchOptions = useMemo(() => menuSearchItems?.length ? menuSearchItems : flatten(menuItems), [menuItems, menuSearchItems]);
  const isSearching = searchInput.trim().length > 0;
  const sidebarHidden = isMobile ? !mobileOpen : !open;

  const toggle = (id) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const selectCompany = (_, value) => {
    if (value) onCompanyChange(value);
  };

  return (
    <>
      {isMobile && mobileOpen && <Box className="sidebar-backdrop" onClick={onCloseMobile} />}
      <Box
        component="aside"
        className={`sidebar ${isMobile ? `sidebar-mobile ${mobileOpen ? 'sidebar-mobile-open' : ''}` : (open ? 'sidebar-open' : 'sidebar-closed')}`}
        aria-hidden={sidebarHidden}
      >
        <Box className="sidebar-brand">
          <DomainOutlinedIcon className="sidebar-brand-icon" />
          {(!isMobile || mobileOpen) && (
            <Box className="sidebar-brand-text">
              <Autocomplete
                fullWidth
                options={companies || []}
                value={selectedCompany || null}
                onChange={selectCompany}
                getOptionLabel={(option) => option?.comAbbr || option?.comName || option?.comCode || ''}
                isOptionEqualToValue={(option, value) => option.comCode === value.comCode}
                disableClearable
                size="small"
                renderInput={(params) => <TextField {...params} variant="standard" placeholder={intl.formatMessage({ id: 'selectCompany' })} InputProps={{ ...params.InputProps, disableUnderline: true }} />}
                sx={{
                  width: '100%',
                  '& .MuiInputBase-root': { color: 'inherit', fontSize: '1rem', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' },
                  '& .MuiInputBase-input': { minWidth: '0 !important', width: '100% !important' },
                  '& .MuiAutocomplete-endAdornment': { color: 'inherit' },
                  '& .MuiSvgIcon-root': { color: 'inherit' },
                }}
              />
              <Typography className="brand-edition">{intl.formatMessage({ id: 'appName' })}</Typography>
            </Box>
          )}
          <IconButton className="sidebar-collapse-btn" onClick={isMobile ? onCloseMobile : onToggle} title={intl.formatMessage({ id: open ? 'closeSidebar' : 'openSidebar' })} aria-label={intl.formatMessage({ id: open ? 'closeSidebar' : 'openSidebar' })} size="small"><MenuOpenIcon /></IconButton>
        </Box>

        {!sidebarHidden && (
          <Box className="sidebar-search">
            <Autocomplete
              fullWidth
              size="small"
              forcePopupIcon={false}
              options={searchOptions}
              inputValue={searchInput}
              getOptionLabel={itemLabel}
              renderOption={(props, option, { inputValue }) => {
                const { key, ...restProps } = props;
                return <li key={key} {...restProps}><div>{highlightSearchText(itemLabel(option), inputValue)}</div></li>;
              }}
              onChange={(_, value) => { if (value) { onMenuItemClick(value); onCloseMobile?.(); } }}
              onInputChange={(_, value, reason) => setSearchInput(reason === 'reset' ? '' : value)}
              renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder={intl.formatMessage({ id: 'menuSearch' })} InputProps={{ ...params.InputProps, startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }} />}
            />
          </Box>
        )}

        <Divider />
        <List className="sidebar-nav" disablePadding>
          {!sidebarHidden && menuStatus === 'loading' && <Box sx={{ px: 2, py: 1 }}><Skeleton /><Skeleton /><Skeleton /></Box>}
          {!sidebarHidden && menuStatus === 'error' && <Alert severity="error" action={<ButtonlessRetry onRetry={onRetry} label={intl.formatMessage({ id: 'retry' })} />} sx={{ m: 1, fontSize: 12 }}>{intl.formatMessage({ id: 'menuLoadFailed' })}</Alert>}
          {!sidebarHidden && menuStatus === 'success' && isSearching && searchOptions.filter((item) => itemLabel(item).toLocaleLowerCase().includes(searchInput.toLocaleLowerCase())).map((item) => <ListItemButton key={item.sideMenuID || item.functionName} className="sidebar-menu-item" onClick={() => { onMenuItemClick(item); onCloseMobile?.(); }}><ListItemIcon sx={{ minWidth: 34 }}><SearchIcon fontSize="small" /></ListItemIcon><ListItemText primary={highlightSearchText(itemLabel(item), searchInput)} /></ListItemButton>)}
          {!sidebarHidden && menuStatus === 'success' && !isSearching && menuItems.map((item) => <MenuNode key={item.sideMenuID || item.functionName || item.componentName} item={item} open={!sidebarHidden} expanded={expanded} onToggle={toggle} onSelect={(value) => { onMenuItemClick(value); onCloseMobile?.(); }} />)}
          {!sidebarHidden && menuStatus === 'success' && !menuItems.length && !isSearching && <Typography className="sidebar-empty">{intl.formatMessage({ id: 'noMenus' })}</Typography>}
        </List>

        <Box className="sidebar-footer">
          <button className="logout-btn" type="button" onClick={onLogout} title={intl.formatMessage({ id: 'logout' })}>
            <LogoutOutlinedIcon fontSize="small" />
            {!sidebarHidden && <span>{intl.formatMessage({ id: 'logout' })}</span>}
          </button>
        </Box>
      </Box>
    </>
  );
}

function ButtonlessRetry({ onRetry, label }) {
  return <button className="sidebar-retry" type="button" onClick={onRetry}>{label}</button>;
}
