import axios, { AxiosRequestConfig, Method } from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from "./tokenStore";
import { ClearLoggedInUser } from '../function/VerificationCheck';
import { clearScheduledRefresh, scheduleSilentRefresh } from './authScheduler';
import { getCsrfToken } from './csrf';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

const apiClient = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
});

apiClient.interceptors.request.use(async (config) => {
    const method = String(config.method || 'get').toLowerCase();

    if (!['get', 'head', 'options'].includes(method)) {
        const csrfToken = await getCsrfToken();
        if (csrfToken) {
            config.headers = {
                ...config.headers,
                'x-csrf-token': csrfToken,
            };
        }
    }

    return config;
});

async function refreshAccessToken(): Promise<string | null> {
    try {
        const res = await apiClient.post(`/auth/refresh`);
        const { accessToken } = res.data;

        setAccessToken(accessToken);
        scheduleSilentRefresh(accessToken);
        return accessToken;
    } catch {
        clearScheduledRefresh();
        clearAccessToken();
        return null;
    }
}

export async function api<T = any>(
    method: Method,
    path: string,
    payload?: any
): Promise<T> {
    const token = getAccessToken();

    const config: AxiosRequestConfig = {
        method,
        url: path,
        headers: {},
    };

    if (method.toLowerCase() === 'get') {
        config.params = payload;
    } else {
        config.data = payload;
    }

    if (token) {
        (config.headers as any).Authorization = `Bearer ${token}`;
    }

    try {
        const res = await apiClient.request(config);
        return res.data;
    } catch (error: any) {
        if (error.response?.status === 401) {
        const newAccess = await refreshAccessToken();
        if (!newAccess) {
            ClearLoggedInUser();
            throw error;
        }

        const retryConfig: AxiosRequestConfig = {
            ...config,
            headers: {
            ...config.headers,
            Authorization: `Bearer ${newAccess}`,
            },
        };

        const retryRes = await apiClient.request(retryConfig);
        return retryRes.data;
        }

        throw error;
    }
}
