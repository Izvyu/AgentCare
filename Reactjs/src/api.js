import axios from 'axios';

export function getApiBase() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    const port = import.meta.env.VITE_API_PORT || '44311';
    return `http://${window.location.hostname}:${port}/AgentCare_API`;
  }
  return `${window.location.origin}/AgentCare_API`;
}

export const api = axios.create({
  baseURL: getApiBase(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export function unwrap(response) {
  const envelope = response?.data;
  if (!envelope?.success) {
    throw new Error(envelope?.message || 'Request failed');
  }
  return envelope.data;
}
