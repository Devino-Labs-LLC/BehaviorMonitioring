import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

let cachedCsrfToken: string | null = null;
let csrfRequest: Promise<string | null> | null = null;

export function clearCsrfToken() {
    cachedCsrfToken = null;
    csrfRequest = null;
}

export async function getCsrfToken(forceRefresh = false): Promise<string | null> {
    if (!forceRefresh && cachedCsrfToken) {
        return cachedCsrfToken;
    }

    if (!forceRefresh && csrfRequest) {
        return csrfRequest;
    }

    csrfRequest = axios
        .get<{ csrfToken?: string }>(`${API_BASE}/csrf-token`, {
            withCredentials: true,
        })
        .then((response) => {
            cachedCsrfToken = response.data?.csrfToken ?? null;
            return cachedCsrfToken;
        })
        .catch(() => {
            cachedCsrfToken = null;
            return null;
        })
        .finally(() => {
            csrfRequest = null;
        });

    return csrfRequest;
}
