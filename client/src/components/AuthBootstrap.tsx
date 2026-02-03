"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { setAccessToken, clearAccessToken } from "@/lib/tokenStore";
import { scheduleSilentRefresh } from "../lib/authScheduler";
import { ClearLoggedInUser } from "../function/VerificationCheck";

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

export default function AuthBootstrap() {
    const [, setReady] = useState(false);

    useEffect(() => {
        if (isBootstrapping || isBootstrapped) return;
        
        isBootstrapping = true;
        
        (async () => {
            try {
                console.log('[AuthBootstrap] Starting refresh request');
                console.log('[AuthBootstrap] API_BASE:', API_BASE);
                console.log('[AuthBootstrap] Full URL:', `${API_BASE}/auth/refresh`);
                
                const res = await axios.post(`${API_BASE}/auth/refresh`, null, {
                    withCredentials: true,
                });
                
                console.log('[AuthBootstrap] Refresh successful');
                setAccessToken(res.data.accessToken);
                scheduleSilentRefresh(res.data.accessToken);
            } catch (error: any) {
                console.error('[AuthBootstrap] Refresh failed:', error.response?.status, error.response?.data);
                // If refresh fails and user data exists, clear it
                clearAccessToken();
                ClearLoggedInUser();
            } finally {
                isBootstrapped = true;
                isBootstrapping = false;
                setReady(true);
                notifyBootstrapComplete();
            }
        })();
    }, []);

    return null;
}