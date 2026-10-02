import { Box, Typography } from '@mui/material';
import { useIntl } from 'react-intl';

export default function NotificationPlaceholder() {
  const intl = useIntl();
  return <Box className="notification-placeholder"><Typography fontWeight={700}>{intl.formatMessage({ id: 'notifications' })}</Typography><Typography color="text.secondary" variant="body2">{intl.formatMessage({ id: 'noNotifications' })}</Typography></Box>;
}
