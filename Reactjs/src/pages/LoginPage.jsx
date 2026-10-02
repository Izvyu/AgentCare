import { useCallback, useEffect, useState } from 'react';
import { Alert, Autocomplete, Box, Button, CircularProgress, IconButton, InputAdornment, Snackbar, TextField, Typography } from '@mui/material';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import DomainOutlinedIcon from '@mui/icons-material/DomainOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { actions } from '../store';
import { api, unwrap } from '../api';
import LocaleSwitcher from '../components/LocaleSwitcher';
import { readAgentCareJson, removeAgentCareValue, writeAgentCareJson } from '../storage';
import './LoginPage.css';

const REMEMBERED_LOGIN_KEY = 'rememberedLogin';
const EMPTY_FIELD_ERRORS = { company: '', account: '', password: '' };

export default function LoginPage() {
  const intl = useIntl();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const locale = useSelector((state) => state.app.locale);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [form, setForm] = useState({ account: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [companyStatus, setCompanyStatus] = useState('loading');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState(EMPTY_FIELD_ERRORS);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  const loadCompanies = useCallback(async (active = () => true) => {
    setCompanyStatus('loading');
    const remembered = readAgentCareJson(REMEMBERED_LOGIN_KEY);
    try {
      const data = unwrap(await api.get('/api/auth/companies'));
      if (!active()) return;
      const nextCompanies = Array.isArray(data) ? data : [];
      setCompanies(nextCompanies);
      const rememberedCompany = nextCompanies.find((item) => item.comCode === remembered?.companyCode);
      if (rememberedCompany) setSelectedCompany(rememberedCompany);
      setCompanyStatus('success');
    } catch {
      if (active()) setCompanyStatus('error');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const remembered = readAgentCareJson(REMEMBERED_LOGIN_KEY);
    if (remembered?.account) {
      setForm((current) => ({ ...current, account: remembered.account }));
      setRememberMe(true);
    }
    loadCompanies(() => active);
    return () => { active = false; };
  }, [loadCompanies]);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextFieldErrors = {
      company: selectedCompany ? '' : intl.formatMessage({ id: 'companyRequired' }),
      account: form.account.trim() ? '' : intl.formatMessage({ id: 'accountRequired' }),
      password: form.password ? '' : intl.formatMessage({ id: 'passwordRequired' }),
    };
    setFieldErrors(nextFieldErrors);
    if (Object.values(nextFieldErrors).some(Boolean)) {
      return;
    }
    setSubmitting(true);
    try {
      const data = await unwrap(await api.post('/api/auth/login', {
        account: form.account,
        password: form.password,
        selectedCompanyCode: selectedCompany.comCode,
      }));
      const loggedInCompany = (data.companyInfo || []).find((item) => item.comCode === selectedCompany.comCode) || selectedCompany;
      dispatch(actions.setSession({ user: data.user, companies: data.companyInfo, selectedCompany: loggedInCompany }));
      if (rememberMe) {
        writeAgentCareJson(REMEMBERED_LOGIN_KEY, { account: form.account, companyCode: selectedCompany.comCode });
      } else {
        removeAgentCareValue(REMEMBERED_LOGIN_KEY);
      }
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || intl.formatMessage({ id: 'loginFailed' });
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box className="login-page">
      <Box className="brand-panel">
        <Box className="brand-content">
          <Box className="brand-icon"><DomainOutlinedIcon /></Box>
          <Typography className="brand-title">AgentCare</Typography>
          <Typography className="brand-subtitle">{intl.formatMessage({ id: 'brandSubtitle' })}</Typography>
        </Box>
      </Box>
      <Box className="form-panel">
        <Box className="login-form" component="form" onSubmit={submit} noValidate>
          <Box className="form-header">
            <Box className="form-header-copy">
              <Typography component="h1" className="form-title">{intl.formatMessage({ id: 'loginTitle' })}</Typography>
              <Typography className="form-subtitle">{intl.formatMessage({ id: 'loginSubtitle' })}</Typography>
            </Box>
            <LocaleSwitcher value={locale} onChange={(value) => dispatch(actions.setLocale(value))} compact />
          </Box>

          <Box className="form-group">
            <Typography component="label" className="form-label" htmlFor="login-company">
              <BusinessOutlinedIcon fontSize="small" />{intl.formatMessage({ id: 'company' })}
            </Typography>
            <Autocomplete
              id="login-company"
              options={companies}
              value={selectedCompany}
              loading={companyStatus === 'loading'}
              onChange={(_, value) => { setSelectedCompany(value); setFieldErrors((current) => ({ ...current, company: '' })); }}
              getOptionLabel={(option) => option ? `[${option.comCode}] ${option.comName || option.comCode}` : ''}
              isOptionEqualToValue={(option, value) => option.comCode === value.comCode}
              noOptionsText={intl.formatMessage({ id: 'noCompany' })}
              renderInput={(params) => <TextField {...params} placeholder={intl.formatMessage({ id: 'selectCompany' })} size="small" error={Boolean(fieldErrors.company)} helperText={fieldErrors.company} />}
            />
            {companyStatus === 'error' && <Alert severity="error" action={<Button size="small" onClick={() => loadCompanies()}>{intl.formatMessage({ id: 'retry' })}</Button>}>{intl.formatMessage({ id: 'loadCompaniesFailed' })}</Alert>}
            {companyStatus === 'success' && companies.length === 0 && <Alert severity="info" action={<Button size="small" onClick={() => loadCompanies()}>{intl.formatMessage({ id: 'retry' })}</Button>}>{intl.formatMessage({ id: 'noCompany' })}</Alert>}
          </Box>

          <Box className="form-group">
            <Typography component="label" className="form-label" htmlFor="login-account">
              <PersonOutlineOutlinedIcon fontSize="small" />{intl.formatMessage({ id: 'account' })}
            </Typography>
            <TextField id="login-account" value={form.account} onChange={update('account')} placeholder={intl.formatMessage({ id: 'usernamePlaceholder' })} autoComplete="username" size="small" fullWidth error={Boolean(fieldErrors.account)} helperText={fieldErrors.account} />
          </Box>

          <Box className="form-group">
            <Box className="password-header">
              <Typography component="label" className="form-label" htmlFor="login-password">
                <LockOutlinedIcon fontSize="small" />{intl.formatMessage({ id: 'password' })}
              </Typography>
              <Button className="forgot-password" variant="text" size="small" onClick={() => setSnackbar({ open: true, message: intl.formatMessage({ id: 'forgotPasswordMessage' }), severity: 'info' })}>
                {intl.formatMessage({ id: 'forgotPassword' })}
              </Button>
            </Box>
            <TextField
              id="login-password"
              value={form.password}
              onChange={update('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              size="small"
              fullWidth
              error={Boolean(fieldErrors.password)}
              helperText={fieldErrors.password}
              InputProps={{
                endAdornment: <InputAdornment position="end"><IconButton aria-label={showPassword ? intl.formatMessage({ id: 'hidePassword' }) : intl.formatMessage({ id: 'showPassword' })} onClick={() => setShowPassword((visible) => !visible)} edge="end">{showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton></InputAdornment>,
              }}
            />
          </Box>

          <label className="checkbox-group">
            <input className="form-checkbox" type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
            <span className="checkbox-label">{intl.formatMessage({ id: 'rememberMe' })}</span>
          </label>

          <Button type="submit" className="btn-primary" variant="contained" size="large" disabled={submitting || companyStatus !== 'success' || companies.length === 0}>
            {submitting ? <CircularProgress size={22} color="inherit" /> : intl.formatMessage({ id: 'login' })}
          </Button>

          <Box className="form-footer">
            <Box className="footer-links">
              {['helpSupport', 'security', 'privacyPolicy'].map((id) => <Button key={id} className="footer-link" variant="text" size="small" onClick={() => setSnackbar({ open: true, message: intl.formatMessage({ id: 'supportPlaceholder' }), severity: 'info' })}>{intl.formatMessage({ id })}</Button>)}
            </Box>
            <Box className="system-status"><span className={`status-indicator ${companyStatus === 'success' ? '' : 'status-indicator-unavailable'}`} />{intl.formatMessage({ id: companyStatus === 'success' ? 'systemStatus' : 'apiUnavailable' })}</Box>
          </Box>
        </Box>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((current) => ({ ...current, open: false }))} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
