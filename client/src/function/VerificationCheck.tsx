import { getAccessToken } from '../lib/tokenStore';
import { getBootstrapStatus } from '../components/AuthBootstrap';
import { clearScheduledRefresh } from '../lib/authScheduler';

const parseStoredUserData = () => {
    if (globalThis.window === undefined) {
        return null;
    }

    const userData = globalThis.localStorage.getItem('bmUserData');
    if (!userData) {
        return null;
    }

    try {
        return JSON.parse(userData);
    } catch {
        ClearLoggedInUser();
        return null;
    }
};

export const SetLoggedInUser = (loginSuccessful: boolean, user: { uName: string, compID: string | number, compName: string, isAdmin: boolean }) => {
    if (globalThis.window === undefined) return true;
    
    if (loginSuccessful) {
        const dataToStore = {
            bmLoggedInStatus: loginSuccessful,
            bmUsername: user.uName,
            bmCompanyID: String(user.compID),
            bmCompanyName: user.compName,
            bmAdmin: user.isAdmin
        };

        globalThis.localStorage.setItem('bmUserData', JSON.stringify(dataToStore));
    }
    else {
        ClearLoggedInUser();
    }
}

export const ClearLoggedInUser = () => {
    if (globalThis.window === undefined) return true;

    clearScheduledRefresh();
    globalThis.localStorage.removeItem('bmUserData');
};

export const GetLoggedInUserStatus = () => {
    if (globalThis.window === undefined) return false;

    // Check if we're still bootstrapping - don't log out yet
    const { isBootstrapping, isBootstrapped } = getBootstrapStatus();
    
    // Check localStorage for user data first
    const parsedData = parseStoredUserData();
    if (!parsedData) return false;
    
    if (!parsedData.bmLoggedInStatus) return false;
    
    // If still bootstrapping and user data exists, stay logged in (wait for token refresh)
    if (isBootstrapping) return true;
    
    // After bootstrap completes, check for token
    if (isBootstrapped) {
        const token = getAccessToken();
        // If no token after bootstrap, the refresh failed - log out
        if (!token) {
            ClearLoggedInUser();
            return false;
        }
        return true;
    }
    
    // Before bootstrap starts, if user data exists, assume logged in temporarily
    // This prevents premature redirects on page load
    return true;
};

export const GetLoggedInUser = () => {
    if (globalThis.window === undefined) return null;

    if (GetLoggedInUserStatus()) {
        const parsedData = parseStoredUserData();
        if (parsedData) {
            return String(parsedData.bmUsername);
        }
    }
    return null;
};

export const GetAdminStatus = () => {
    if (globalThis.window === undefined) return true;
    
    if (GetLoggedInUserStatus()) {
        const parsedData = parseStoredUserData();
        if (parsedData) {
            return Boolean(parsedData.bmAdmin);
        }
    }
    return false;
};

export const NeedToLogout = (uName: string) => {
    if (globalThis.window === undefined) return true;
    
    if (GetLoggedInUserStatus() && uName === GetLoggedInUser()) {
        return false;
    }

    ClearLoggedInUser();
    return true;
};
export const validateEmail = (email: string): boolean => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
    if (!password) return false;
    return password.length >= 8;
};

export const validateUsername = (username: string): boolean => {
    if (!username) return false;
    return username.length >= 3;
};
