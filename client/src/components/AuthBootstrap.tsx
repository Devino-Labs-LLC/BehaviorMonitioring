"use client";

import { useEffect } from "react";
import axios from "axios";
import { setAccessToken, clearAccessToken } from "@/lib/tokenStore";
import { clearScheduledRefresh, scheduleSilentRefresh } from "../lib/authScheduler";
import { ClearLoggedInUser } from "../function/VerificationCheck";
import { getCsrfToken } from "@/lib/csrf";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

// Track if bootstrap is complete
let isBootstrapped = false;
let isBootstrapping = false;
let bootstrapListeners: Array<() => void> = [];

export function getBootstrapStatus() {
    return { isBootstrapped, isBootstrapping };
}

// Allow components to wait for bootstrap to complete
export function onBootstrapComplete(callback: () => void) {
    if (isBootstrapped) {
        callback();
    } else {
        bootstrapListeners.push(callback);
    }
}

function notifyBootstrapComplete() {
    bootstrapListeners.forEach(cb => cb());
    bootstrapListeners = [];
}

function hasStoredUserSession() {
    if (globalThis.window === undefined) return false;

    const storedUserData = globalThis.localStorage.getItem('bmUserData');
    if (!storedUserData) return false;

    try {
        const parsed = JSON.parse(storedUserData);
        return Boolean(parsed?.bmLoggedInStatus && parsed?.bmUsername);
    } catch {
        return false;
    }
}

export default function AuthBootstrap() {
    useEffect(() => {
        if (isBootstrapping || isBootstrapped) return;
        
        isBootstrapping = true;

        if (!hasStoredUserSession()) {
            clearScheduledRefresh();
            clearAccessToken();
            isBootstrapped = true;
            isBootstrapping = false;
            notifyBootstrapComplete();
            return;
        }
        
        (async () => {
            try {
                const csrfToken = await getCsrfToken();
                const res = await axios.post(`${API_BASE}/auth/refresh`, null, {
                    withCredentials: true,
                    headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
                });
                setAccessToken(res.data.accessToken);
                scheduleSilentRefresh(res.data.accessToken);
            } catch {
                // If refresh fails and user data exists, clear it
                clearScheduledRefresh();
                clearAccessToken();
                ClearLoggedInUser();
            } finally {
                isBootstrapped = true;
                isBootstrapping = false;
                notifyBootstrapComplete();
            }
        })();
    }, []);

    return null;
}
