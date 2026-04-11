// Authenticated fetch wrapper.
//
// Always attaches a FRESH Supabase access token to the Authorization
// header by asking supabase.auth.getSession() right before the call
// (that method auto-refreshes the token when it's close to expiring).
//
// If the server still rejects the call with 401, we explicitly call
// refreshSession() once and retry, so the user is never stuck with
// an expired token while the refresh_token is still valid.

import { supabase } from "../supabaseClient";

function buildHeaders(baseHeaders, token) {
  const headers = { ...(baseHeaders || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function authedFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || "";

  let response = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers, token)
  });

  if (response.status === 401 && token) {
    try {
      const { data: { session: refreshed } } = await supabase.auth.refreshSession();
      const newToken = refreshed?.access_token || "";
      if (newToken && newToken !== token) {
        response = await fetch(url, {
          ...options,
          headers: buildHeaders(options.headers, newToken)
        });
      }
    } catch {
      // fall through — caller handles the 401 normally
    }
  }

  return response;
}
