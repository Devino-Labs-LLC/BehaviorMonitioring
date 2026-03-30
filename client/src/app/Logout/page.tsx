"use client";
import React, {useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../styles/components.module.scss';
import Header from '../../components/header';
import Footer from '../../components/footer';
import Button from '../../components/Button';
import Loading from '../../components/loading';
import { clearAccessToken } from '../../lib/tokenStore';
import { ClearLoggedInUser, GetLoggedInUser, GetLoggedInUserStatus } from '../../function/VerificationCheck';
import type { LogoutResponse } from '../../dto/modules/auth/LogoutResponse';
import { api } from '../../lib/Api';
import { debounceAsync } from '../../function/debounce';

const Logout: React.FC = () => {
    const navigate = useRouter();
    const loggedInUser = GetLoggedInUser();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('');

    useEffect(() => {
        executeLogout();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                routeChange();
            }
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => globalThis.removeEventListener('keydown', handleKeyDown);
    }, []);

    const submitLogoutForm = async() => {
        setIsLoading(true);

        try {
            const response = await api<LogoutResponse>('post','/auth/verifyEmployeeLogout', { username: loggedInUser });
            
            if (response.statusCode !== 200) {
                throw new Error(response.serverMessage);
            }
        } catch (error) {
            return setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const executeLogout = () => {
        if (GetLoggedInUserStatus()) {
            debounceAsync(submitLogoutForm, 300)();
            clearAccessToken();
            ClearLoggedInUser();
        }
    }

    const routeChange = () => {
        navigate.push('/Login');
    }

  return (
    <>
        <Header />
        <Head>
            <title>Logout - BMetrics</title>
        </Head>
        <div className={componentStyles.pageBody}>
            <main>
                {isLoading ?
                    <Loading/>
                    :

                    <form className={componentStyles.logoutForm}>
                        <h2>Logout</h2>
                        <p>You have been logged out <br/> Select the login button below to sign in</p>
                        <Button nameOfClass='loginButton' placeholder='Login' btnType='button' isLoading={isLoading} onClick={routeChange}/>
                        <p className={componentStyles.statusMessage}>{statusMessage || null}</p>
                    </form>
                }
            </main>
        </div>
        <Footer />
    </>
  );
};

export default Logout;
