// ── Supabase REST Client (sem SDK) ──────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qysuiqrqfcanusyfwuri.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_aQh7tS_4_evF0pvDIOnatw_w5Y24KB8";

// ── Session helpers ─────────────────────────────────────────────────────────
export function getToken() {
  return sessionStorage.getItem("sb-token");
}

export function getUser() {
  try { return JSON.parse(sessionStorage.getItem("sb-user")); }
  catch { return null; }
}

export function setSession(token, user) {
  sessionStorage.setItem("sb-token", token);
  sessionStorage.setItem("sb-user", JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem("sb-token");
  sessionStorage.removeItem("sb-user");
}

// ── Base fetch ──────────────────────────────────────────────────────────────
export async function sbFetch(path, opts = {}) {
  const token = getToken();
  const headers = {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers });
  return res;
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const supabaseAuth = {
  async signInWithPassword({ email, password }) {
    try {
      const res = await sbFetch("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) return { data: null, error: json };
      const token = json.access_token;
      const user = json.user || json;
      setSession(token, user);
      return { data: { token, user }, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  },

  async signOut() {
    try {
      const token = getToken();
      if (token) {
        await sbFetch("/auth/v1/logout", { method: "POST" });
      }
    } catch { /* ignore */ }
    clearSession();
  },

  getSession() {
    return getUser();
  },
};

// ── Query Builder (PostgREST) ───────────────────────────────────────────────
function createBuilder(table) {
  let _method = "GET";
  let _body = null;
  let _params = new URLSearchParams();
  let _extraHeaders = {};
  let _filters = [];

  const builder = {
    select(columns = "*") {
      _method = "GET";
      _params.set("select", columns);
      return builder;
    },

    insert(data) {
      _method = "POST";
      _body = data;
      _extraHeaders["Prefer"] = "return=representation";
      return builder;
    },

    update(data) {
      _method = "PATCH";
      _body = data;
      _extraHeaders["Prefer"] = "return=representation";
      return builder;
    },

    delete() {
      _method = "DELETE";
      _extraHeaders["Prefer"] = "return=representation";
      return builder;
    },

    eq(col, val) {
      _filters.push([col, `eq.${val}`]);
      return builder;
    },

    order(col, { ascending = true } = {}) {
      _params.set("order", `${col}.${ascending ? "asc" : "desc"}`);
      return builder;
    },

    limit(n) {
      _params.set("limit", String(n));
      return builder;
    },

    single() {
      _extraHeaders["Accept"] = "application/vnd.pgrst.object+json";
      return builder;
    },

    async execute() {
      try {
        // Add filters to params
        for (const [col, val] of _filters) {
          _params.set(col, val);
        }

        const qs = _params.toString();
        const path = `/rest/v1/${table}${qs ? `?${qs}` : ""}`;

        const res = await sbFetch(path, {
          method: _method,
          headers: _extraHeaders,
          ...(_body ? { body: JSON.stringify(_body) } : {}),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: res.statusText }));
          return { data: null, error: err };
        }

        // 204 No Content (e.g. delete with no return)
        if (res.status === 204) return { data: null, error: null };

        const data = await res.json();
        return { data, error: null };
      } catch (err) {
        return { data: null, error: { message: err.message } };
      }
    },
  };

  return builder;
}

export const db = {
  from(table) {
    return createBuilder(table);
  },
};
