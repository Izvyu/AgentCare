import { useIntl } from 'react-intl';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';

export default function LocaleSwitcher({ value, onChange, compact = false, id = 'locale-select' }) {
  const intl = useIntl();
  return (
    <label className={`locale-dropdown${compact ? ' locale-dropdown--compact' : ''}`} htmlFor={id}>
      <LanguageOutlinedIcon fontSize="small" />
      <span className="locale-dropdown__label">{intl.formatMessage({ id: 'language' })}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-label={intl.formatMessage({ id: 'language' })}>
        <option value="zh-tw">{intl.formatMessage({ id: 'traditionalChinese' })}</option>
        <option value="en">{intl.formatMessage({ id: 'english' })}</option>
      </select>
    </label>
  );
}
