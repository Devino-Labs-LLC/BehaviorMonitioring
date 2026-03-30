import { setAccessToken, clearAccessToken } from "./tokenStore";
import axios from "axios";
import { getCsrfToken } from "./csrf";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

export function clearScheduledRefresh() {
    if (refreshTimeout) {
        clearTimeout(refreshTimeout);
        refreshTimeout = null;
    }
}

export function scheduleSilentRefresh(accessToken: string) {
    clearScheduledRefresh();

    const payload = JSON.parse(atob(accessToken.split(".")[1]));
    const issuedAtMs = payload.iat ? payload.iat * 1000 : Date.now();
    const expMs = payload.exp * 1000;
    const ttlMs = Math.max(expMs - issuedAtMs, 1000);
    const earlyRefreshMs = Math.min(30_000, Math.max(Math.floor(ttlMs * 0.25), 1000));
    const refreshAt = expMs - earlyRefreshMs;
    const delay = Math.max(refreshAt - Date.now(), 1000);

    refreshTimeout = setTimeout(async () => {
        try {
        const csrfToken = await getCsrfToken();
        const res = await axios.post(`${API_BASE}/auth/refresh`, null, {
            withCredentials: true,
            headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
        });
        setAccessToken(res.data.accessToken);
        scheduleSilentRefresh(res.data.accessToken);
        } catch {
        clearScheduledRefresh();
        clearAccessToken();
        }
    }, delay);
}
