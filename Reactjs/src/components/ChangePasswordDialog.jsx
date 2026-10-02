import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Stack, TextField } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useIntl } from 'react-intl';
import { api, unwrap } from '../api';

const EMPTY_FORM = { oldPassword: '', newPassword: '', confirmPassword: '' };

export default function ChangePasswordDialog({ open, onClose, onSuccess }) {
  const intl = useIntl();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState({ oldPassword: false, newPassword: false, confirmPassword: false });

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setError('');
      setVisible({ oldPassword: false, newPassword: false, confirmPassword: false });
    }
  }, [open]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async () => {
    setError('');
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      setError(intl.formatMessage({ id: 'required' }));
      return;
    }
    if (!/^[\x21-\x7E]{1,20}$/.test(form.newPassword) || !/^[\x21-\x7E]{1,20}$/.test(form.oldPassword)) {
      setError(intl.formatMessage({ id: 'passwordPolicy' }));
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError(intl.formatMessage({ id: 'passwordMismatch' }));
      return;
    }
    if (form.newPassword === form.oldPassword) {
      setError(intl.formatMessage({ id: 'samePassword' }));
      return;
    }
    setSaving(true);
    try {
      const response = await api.post('/api/auth/change-password', form);
      unwrap(response);
      onSuccess?.(intl.formatMessage({ id: 'passwordChanged' }));
      onClose();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || intl.formatMessage({ id: 'passwordChangeFailed' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{intl.formatMessage({ id: 'changePassword' })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {['oldPassword', 'newPassword', 'confirmPassword'].map((key) => (
            <TextField
              key={key}
              label={intl.formatMessage({ id: key })}
              type={visible[key] ? 'text' : 'password'}
              value={form[key]}
              onChange={update(key)}
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end"><IconButton aria-label={visible[key] ? intl.formatMessage({ id: 'hidePassword' }) : intl.formatMessage({ id: 'showPassword' })} onClick={() => setVisible((current) => ({ ...current, [key]: !current[key] }))} edge="end">{visible[key] ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton></InputAdornment>,
              }}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{intl.formatMessage({ id: 'cancel' })}</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>{saving ? intl.formatMessage({ id: 'saving' }) : intl.formatMessage({ id: 'save' })}</Button>
      </DialogActions>
    </Dialog>
  );
}
