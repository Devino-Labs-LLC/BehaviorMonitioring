"use client";
import React, { useState, useEffect, Suspense } from 'react';
import Head from 'next/head';
import { useRouter, useSearchParams } from 'next/navigation';
import componentStyles from '../../styles/components.module.scss';
import Header from '../../components/header';
import Footer from '../../components/footer';
import InputFields from '../../components/Inputfield';
import Button from '../../components/Button';
import Loading from '../../components/loading';
import { GetLoggedInUserStatus } from '../../function/VerificationCheck'
import { CheckUsername, CheckPassword } from '../../function/EntryCheck';
import { SetLoggedInUser } from '../../function/VerificationCheck';
import { debounceAsync } from '../../function/debounce';
import { api } from '../../lib/Api';
import type { LoginResponse } from '../../dto';
import { setAccessToken } from '../../lib/tokenStore';
import { scheduleSilentRefresh } from "../../lib/authScheduler";

const LoginContent: React.FC = () => {
    const searchParams = useSearchParams();
    const previousUrl = searchParams.get('previousUrl');
    const navigate = useRouter();
    const [userStatus, setUserStatus] = useState<boolean>(GetLoggedInUserStatus());    
    const [uName, setuName] = useState<string>('');
    const [pWord, setPWord] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('');

    useEffect(() => {
        if (userStatus) {
            navigate.push(previousUrl || '/');
        }
    }, [userStatus, navigate, previousUrl]);

    const submitLoginForm = React.useCallback(async () => {
        setIsLoading(true);
        if (uName.length < 1 || pWord.length < 1) {
            setIsLoading(false);
            return setStatusMessage('All fields must be filled out');
        }
        else if (!CheckUsername(uName)) {
            setIsLoading(false);
            return setStatusMessage('Username is not valid')
        }
        else if (!CheckPassword(pWord)) {
            setIsLoading(false);
            return setStatusMessage('Password is incorrect')  
        }

        try {
            const response = await api<LoginResponse>('post','/auth/verifyEmployeeLogin', { username: uName, password: pWord });

            if (response.statusCode === 200) {
                if (response.accessToken) {
                    setAccessToken(response.accessToken);
                    scheduleSilentRefresh(response.accessToken);
                }
                SetLoggedInUser(response.loginStatus, response.user);
                setUserStatus(true);
                navigate.push(previousUrl || '/');
            }
            else {
                throw new Error(response.serverMessage || 'Login failed');
            }
        }
        catch (error) {
            return setStatusMessage(String(error));
        }
        finally {
            setIsLoading(false);
        }
    }, [uName, pWord, navigate, previousUrl]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                debounceAsync(submitLoginForm, 300)();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [submitLoginForm]);

    return (
        <>
            <Header />
            <Head>
                <title>Login - BMetrics</title>
            </Head>
            <div className={componentStyles.pageBody}>
                <main>
                    {isLoading ? 
                        <Loading/>
                        :
                        <form className={componentStyles.loginForm} onSubmit={submitLoginForm}>
                            <h2>Login</h2>
                            <InputFields name="usernameField" type="text" placeholder="Username" requiring={true} value={uName} onChange={(e) => setuName(e.target.value)}/>
                            <InputFields name="passwordField" type="password" placeholder="Password" requiring={true} value={pWord} onChange={(e) => setPWord(e.target.value)}/>
                            <Button nameOfClass='loginButton' placeholder='Login' btnType='button' isLoading={isLoading} onClick={debounceAsync(submitLoginForm, 300)}/>
                            <p className={componentStyles.statusMessage}>{statusMessage ? statusMessage : null}</p>
                        </form>
                    }
                </main>
            </div>
            <Footer />
        </>
    );
}

export default function Login() {
    return (
        <Suspense fallback={<Loading />}>
            <LoginContent />
        </Suspense>
    );
}