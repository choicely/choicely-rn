export const ROUTES = {
  CHAT_DASHBOARD: "chat_dashboard",
  CHAT_SESSION: "chat_session",
  TEMPLATES_LIST: "templates_list",
  TEMPLATE_DETAIL: "template_detail",
  PROFILE: "profile",
};

const ROUTE_ALIASES = {
  home: { name: ROUTES.CHAT_DASHBOARD },
  dashboard: { name: ROUTES.CHAT_DASHBOARD },
  chat: { name: ROUTES.CHAT_SESSION },
  templates: { name: ROUTES.TEMPLATES_LIST },
  template_detail: { name: ROUTES.TEMPLATE_DETAIL },
  app_template: { name: ROUTES.TEMPLATES_LIST },
  app_history: { name: ROUTES.CHAT_DASHBOARD, params: { focus: "apps" } },
  featured: { name: ROUTES.TEMPLATES_LIST, params: { initialTab: "featured" } },
  profile: { name: ROUTES.PROFILE },
};

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : null;

const safeParseUrl = (value) => {
  try {
    return new URL(value);
  } catch (error) {
    return null;
  }
};

const parseInternalUrl = (value) => {
  if (!value || !value.startsWith("choicely://")) return null;
  const url = safeParseUrl(value);
  if (!url) return null;

  const segments = [];
  if (url.host) segments.push(url.host);
  if (url.pathname) {
    url.pathname
      .split("/")
      .filter(Boolean)
      .forEach((segment) => segments.push(segment));
  }

  const [root, sub, detail] = segments;

  if (root === "studio" && sub === "profile") {
    return { name: ROUTES.PROFILE };
  }

  if (root === "profile") {
    return { name: ROUTES.PROFILE };
  }

  if (root === "studio" && (sub === "chat" || sub === "ai")) {
    return { name: ROUTES.CHAT_SESSION };
  }

  if (root === "studio" && (sub === "dashboard" || sub === "home")) {
    return { name: ROUTES.CHAT_DASHBOARD };
  }

  if (root === "studio" && (sub === "templates" || sub === "template")) {
    const templateKey =
      detail ||
      url.searchParams.get("template") ||
      url.searchParams.get("templateKey") ||
      url.searchParams.get("key");
    if (templateKey) {
      return { name: ROUTES.TEMPLATE_DETAIL, params: { templateKey } };
    }
    return { name: ROUTES.TEMPLATES_LIST };
  }

  if (root === "template") {
    if (sub) {
      return { name: ROUTES.TEMPLATE_DETAIL, params: { templateKey: sub } };
    }
    return { name: ROUTES.TEMPLATES_LIST };
  }

  if (root === "templates") {
    return { name: ROUTES.TEMPLATES_LIST };
  }

  if (root === "my" && sub === "apps") {
    return { name: ROUTES.CHAT_DASHBOARD, params: { focus: "apps" } };
  }

  return null;
};

export const resolveRoute = (input, params) => {
  const normalized = normalizeString(input);
  if (!normalized) return null;

  const internal = parseInternalUrl(normalized);
  if (internal) {
    return {
      ...internal,
      params: { ...(internal.params || {}), ...(params || {}) },
    };
  }

  const alias = ROUTE_ALIASES[normalized];
  if (alias) {
    return {
      name: alias.name,
      params: { ...(alias.params || {}), ...(params || {}) },
    };
  }

  return null;
};

export const buildInitialRoute = ({ route, screen, internalUrl, params } = {}) =>
  resolveRoute(route || screen || internalUrl, params) || {
    name: ROUTES.CHAT_DASHBOARD,
    params: params || {},
  };
