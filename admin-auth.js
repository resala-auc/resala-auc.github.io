/*
 * "Sign in with Google" for every Resala dashboard.
 *
 * The server used to take the email a page sent at its word, so knowing an
 * admin's address was enough to open their dashboard. Now Google proves who is
 * signing in, the server turns that into a signed session, and every request
 * carries it — the email a page sends is ignored for access.
 */
const STORAGE_KEY = "resala-admin-session";
let memorySession = null;
let googleScript = null;

export function currentSession() {
  let session = memorySession;
  try {
    session = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") ?? memorySession;
  } catch {
    // Storage blocked: the in-memory copy still carries this tab.
  }
  return session?.token && session.expiresAt > Date.now() + 60_000 ? session : null;
}

export const sessionToken = () => currentSession()?.token ?? "";

export function signOut() {
  memorySession = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  window.google?.accounts?.id?.disableAutoSelect?.();
}

export const isSignInError = (error) => /sign in again/i.test(String(error?.message ?? ""));

/* An expired session surfaces on whatever request happened to need it; the
   page reloads onto the sign-in card instead of showing a dead-end error. */
export function signedOutGuard(error) {
  if (isSignInError(error)) {
    signOut();
    location.reload();
  }
  return error;
}

function loadGoogleScript() {
  googleScript ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("Could not load Google sign-in. Check your connection or ad blocker, then reload."));
    document.head.appendChild(script);
  });
  return googleScript;
}

export async function mountSignIn({ endpoint, container, onSignedIn, onError }) {
  try {
    const config = await fetch(`${endpoint}?authConfig=1`).then((res) => res.json());
    if (!config.clientId) {
      throw new Error("Google sign-in is not set up on the server yet. Ask whoever maintains the dashboards.");
    }
    await loadGoogleScript();

    window.google.accounts.id.initialize({
      client_id: config.clientId,
      auto_select: false,
      callback: async ({ credential }) => {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ mode: "auth-google", credential })
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok || body.ok === false) throw new Error(body.error || `Sign-in failed (${res.status}).`);

          memorySession = { token: body.session, expiresAt: body.expiresAt, email: body.email, name: body.name };
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memorySession)); } catch {}
          try {
            await onSignedIn(memorySession);
          } catch (error) {
            // Signed in with Google but not on this dashboard's list: let them pick another account.
            signOut();
            throw error;
          }
        } catch (error) {
          onError(error);
        }
      }
    });

    container.innerHTML = "";
    window.google.accounts.id.renderButton(container, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
      width: 260
    });
  } catch (error) {
    onError(error);
  }
}
