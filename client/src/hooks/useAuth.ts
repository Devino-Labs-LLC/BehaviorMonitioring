import { useState, useEffect } from 'react';
import { getBootstrapStatus, onBootstrapComplete } from '../components/AuthBootstrap';
import { GetLoggedInUserStatus, GetLoggedInUser, GetAdminStatus } from '../function/VerificationCheck';

export function useAuth() {
    const [isReady, setIsReady] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const { isBootstrapped } = getBootstrapStatus();
        
        if (isBootstrapped) {
            // Bootstrap already complete
            updateAuthState();
        } else {
            // Wait for bootstrap to complete
            onBootstrapComplete(() => {
                updateAuthState();
            });
        }

        function updateAuthState() {
            const loggedIn = GetLoggedInUserStatus();
            setIsLoggedIn(loggedIn);
            setUsername(GetLoggedInUser());
            setIsAdmin(GetAdminStatus());
            setIsReady(true);
        }
    }, []);

    return {
        isReady,
        isLoggedIn,
        username,
        isAdmin
    };
}
