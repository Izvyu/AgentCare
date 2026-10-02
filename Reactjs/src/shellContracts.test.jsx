import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { HOME_TAB } from './pages/DashboardPage';
import { resolveComponent } from './_Services';
import ComingSoon from './components/ComingSoon';
import Sidebar, { highlightSearchText } from './components/dashboard/Sidebar';
import LoginPage from './pages/LoginPage';
import { api } from './api';
import { messages } from './locales';
import { store } from './store';

describe('AgentCare shell contracts', () => {
  it('keeps Home as the first fixed ComingSoon tab', () => {
    expect(HOME_TAB).toMatchObject({ id: 'home', functionName: 'Home', componentName: 'Home' });
    expect(resolveComponent(HOME_TAB.componentName)).toBe(ComingSoon);
  });

  it('does not duplicate Home in the Sidebar menu', () => {
    render(<IntlProvider locale="zh-tw" messages={messages['zh-tw']}><Sidebar isMobile={false} open companies={[]} selectedCompany={null} menuItems={[]} menuSearchItems={[]} menuStatus="success" onRetry={vi.fn()} onCompanyChange={vi.fn()} onMenuItemClick={vi.fn()} onCloseMobile={vi.fn()} onToggle={vi.fn()} onLogout={vi.fn()} /></IntlProvider>);

    expect(screen.queryByRole('button', { name: '首頁' })).not.toBeInTheDocument();
  });

  it('highlights matching Sidebar search text in green', () => {
    render(<>{highlightSearchText('1.1 產品設定', '產品')}</>);

    expect(screen.getByText('產品')).toHaveStyle({ color: '#4caf50', fontWeight: '700' });
  });

  it('falls back unknown SSO components to ComingSoon', () => {
    expect(resolveComponent('FutureAgentCareFeature')).toBe(ComingSoon);
    expect(resolveComponent()).toBe(ComingSoon);
  });

  it('renders the AssetMgmt-style Login fields without storing a password', async () => {
    const getCompanies = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [{ comCode: 'R01', comName: 'AgentCare Demo' }] } });
    localStorage.clear();
    render(<Provider store={store}><IntlProvider locale="zh-tw" messages={messages['zh-tw']}><MemoryRouter><LoginPage /></MemoryRouter></IntlProvider></Provider>);

    expect(screen.getByText('AgentCare')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('請輸入帳號')).toBeInTheDocument();
    expect(screen.getByLabelText('記住此裝置')).toBeInTheDocument();
    await waitFor(() => expect(getCompanies).toHaveBeenCalled());
    expect(localStorage.getItem('AgentCare_rememberedLogin')).toBeNull();
    getCompanies.mockRestore();
  });

  it('places required messages under their corresponding login fields', async () => {
    const getCompanies = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [{ comCode: 'R01', comName: 'AgentCare Demo' }] } });
    render(<Provider store={store}><IntlProvider locale="zh-tw" messages={messages['zh-tw']}><MemoryRouter><LoginPage /></MemoryRouter></IntlProvider></Provider>);

    await waitFor(() => expect(getCompanies).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '登入' }));

    expect(await screen.findByText('請選擇公司。')).toBeInTheDocument();
    expect(screen.getByText('請輸入帳號。')).toBeInTheDocument();
    expect(screen.getByText('請輸入密碼。')).toBeInTheDocument();
    getCompanies.mockRestore();
  });

  it('retries a failed company load before allowing login', async () => {
    const getCompanies = vi.spyOn(api, 'get')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: { success: true, data: [{ comCode: 'A3', comName: 'AgentCare' }] } });
    render(<Provider store={store}><IntlProvider locale="zh-tw" messages={messages['zh-tw']}><MemoryRouter><LoginPage /></MemoryRouter></IntlProvider></Provider>);

    expect(await screen.findByText('公司清單載入失敗。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登入' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '重新載入' }));
    await waitFor(() => expect(getCompanies).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('公司清單載入失敗。')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: '登入' })).toBeEnabled();
    getCompanies.mockRestore();
  });

  it('shows invalid credentials in a Snackbar', async () => {
    const getCompanies = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [{ comCode: 'R01', comName: 'AgentCare Demo' }] } });
    const postLogin = vi.spyOn(api, 'post').mockRejectedValue({
      message: 'Request failed with status code 401',
      response: { status: 401, data: { success: false, message: '帳號或密碼錯誤', errorCode: null, data: null } },
    });
    render(<Provider store={store}><IntlProvider locale="zh-tw" messages={messages['zh-tw']}><MemoryRouter><LoginPage /></MemoryRouter></IntlProvider></Provider>);

    await waitFor(() => expect(getCompanies).toHaveBeenCalled());
    const companyInput = screen.getByRole('combobox', { name: '公司' });
    fireEvent.change(companyInput, { target: { value: 'R01' } });
    const companyOption = await screen.findByRole('option', { name: '[R01] AgentCare Demo' });
    fireEvent.click(companyOption);
    fireEvent.change(screen.getByPlaceholderText('請輸入帳號'), { target: { value: 'demo' } });
    fireEvent.change(screen.getByLabelText('密碼'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: '登入' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('帳號或密碼錯誤');
    expect(postLogin).toHaveBeenCalledWith('/api/auth/login', { account: 'demo', password: 'wrong', selectedCompanyCode: 'R01' });
    getCompanies.mockRestore();
    postLogin.mockRestore();
  });
});
