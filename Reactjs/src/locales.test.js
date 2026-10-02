import { describe, expect, it } from 'vitest';
import { messages } from './locales';
import { STORAGE_PREFIX, agentcareStorage } from './storage';

describe('AgentCare frontend contracts', () => {
  it('provides both supported locales', () => {
    expect(messages['zh-tw'].loginTitle).toBeTruthy();
    expect(messages.en.loginTitle).toBeTruthy();
  });

  it('namespaces persisted values for AgentCare', () => {
    localStorage.clear();
    agentcareStorage.setItem('preferences', 'test');
    expect(localStorage.getItem(`${STORAGE_PREFIX}preferences`)).toBe('test');
    expect(localStorage.getItem('preferences')).toBeNull();
  });

  it('implements the async redux-persist storage contract', async () => {
    await agentcareStorage.setItem('locale', 'zh-tw');
    expect(await agentcareStorage.getItem('locale')).toBe('zh-tw');
    await agentcareStorage.removeItem('locale');
    expect(await agentcareStorage.getItem('locale')).toBeNull();
  });
});
