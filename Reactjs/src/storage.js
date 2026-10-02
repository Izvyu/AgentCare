const PREFIX = 'AgentCare_';

export const agentcareStorage = {
  getItem(key) {
    return Promise.resolve(localStorage.getItem(`${PREFIX}${key}`));
  },
  setItem(key, value) {
    localStorage.setItem(`${PREFIX}${key}`, value);
    return Promise.resolve();
  },
  removeItem(key) {
    localStorage.removeItem(`${PREFIX}${key}`);
    return Promise.resolve();
  },
};

export const STORAGE_PREFIX = PREFIX;

export function readAgentCareJson(key) {
  try {
    const value = localStorage.getItem(`${PREFIX}${key}`);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function writeAgentCareJson(key, value) {
  localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
}

export function removeAgentCareValue(key) {
  localStorage.removeItem(`${PREFIX}${key}`);
}
