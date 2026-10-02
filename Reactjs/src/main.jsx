import React, { useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { persistor, store } from './store';
import { messages } from './locales';
import App from './App';
import './styles.css';

function Runtime() {
  const locale = useSelector((state) => state.app.locale);
  const dark = useSelector((state) => state.app.dark);
  const theme = useMemo(() => createTheme({
    palette: {
      mode: dark ? 'dark' : 'light',
      primary: { main: dark ? '#8ab4ff' : '#135bec' },
      background: { default: dark ? '#111827' : '#f8fafc', paper: dark ? '#1f2937' : '#ffffff' },
    },
    typography: { fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' },
  }), [dark]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <IntlProvider locale={locale} messages={messages[locale]}>
        <BrowserRouter basename="/AgentCare_UI">
          <App />
        </BrowserRouter>
      </IntlProvider>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Runtime />
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);
