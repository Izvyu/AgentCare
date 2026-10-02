import { ConstructionOutlined } from '@mui/icons-material';
import { Box, Paper, Typography } from '@mui/material';
import { useIntl } from 'react-intl';

export default function ComingSoon({ title }) {
  const intl = useIntl();
  return (
    <Paper className="coming-soon" elevation={0}>
      <Box className="coming-soon-icon"><ConstructionOutlined /></Box>
      <Typography variant="h5" fontWeight={700}>{title || intl.formatMessage({ id: 'placeholder' })}</Typography>
      <Typography color="text.secondary">{intl.formatMessage({ id: 'placeholder' })}</Typography>
    </Paper>
  );
}
