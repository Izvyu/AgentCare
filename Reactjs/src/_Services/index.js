import ComingSoon from '../components/ComingSoon';

// Keep the registry intentionally small until AgentCare business pages are built.
// SSO can publish a function/component name before its AgentCare page exists.
export const componentRegistry = {
  Home: ComingSoon,
};

export function resolveComponent(name) {
  if (!name) return ComingSoon;
  return componentRegistry[name] || ComingSoon;
}

export { ComingSoon };
