"use client";
import React, { useState, useEffect, Suspense } from 'react';
import Head from 'next/head';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import componentStyles from '../../styles/components.module.scss';
import Header from '../../components/header';
import Footer from '../../components/footer';
import Button from '../../components/Button';
import Loading from '../../components/loading';
import { api } from '../../lib/Api';

interface VerifyEmailResponse {
    statusCode: number;
    success: boolean;
    message: string;
}

const VerifyEmailContent: React.FC = () => {
    const searchParams = useSearchParams();
    const navigate = useRouter();
    const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
    const [message, setMessage] = useState<string>('');

    useEffect(() => {
        const tokenParam = searchParams.get('token');
        
        if (!tokenParam) {
            setVerificationStatus('error');
            setMessage('No verification token provided. Please check your email for the verification link.');
            return;
        }

        verifyEmail(tokenParam);
    }, [searchParams]);

    const verifyEmail = async (verificationToken: string) => {
        try {
            const response = await api<VerifyEmailResponse>('POST', '/auth/verify-email', {
                token: verificationToken
            });

            if (response.success && response.statusCode === 200) {
                setVerificationStatus('success');
                setMessage(response.message);
            } else if (response.message?.includes('expired')) {
                setVerificationStatus('expired');
                setMessage(response.message);
            } else {
                setVerificationStatus('error');
                setMessage(response.message || 'Verification failed. Please try again.');
            }
        } catch (error: any) {
            console.error('Email verification error:', error);
            setVerificationStatus('error');
            setMessage(error.response?.data?.message || 'An error occurred during verification. Please try again later.');
        }
    };

    const renderContent = () => {
        switch (verificationStatus) {
            case 'loading':
                return (
                    <div className={componentStyles.verificationContainer}>
                        <Loading />
                        <h2 className={componentStyles.verificationTitle}>Verifying your email...</h2>
                        <p className={componentStyles.verificationMessage}>Please wait while we verify your email address.</p>
                    </div>
                );

            case 'success':
                return (
                    <div className={componentStyles.verificationContainer}>
                        <div className={componentStyles.successIcon}>
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="#10B981" strokeWidth="2" fill="none"/>
                                <path d="M8 12.5l2.5 2.5L16 9" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h2 className={componentStyles.verificationTitle}>Email Verified Successfully!</h2>
                        <p className={componentStyles.verificationMessage}>{message}</p>
                        <div className={componentStyles.verificationActions}>
                            <Button
                                nameOfClass={componentStyles.linkButton}
                                placeholder="Go to Login"
                                btnType="button"
                                onClick={() => navigate.push('/Login')}
                            />
                        </div>
                        <p className={componentStyles.verificationNote}>
                            Note: If you're joining an existing company, your account is pending admin approval. You'll receive an email once approved.
                        </p>
                    </div>
                );

            case 'expired':
                return (
                    <div className={componentStyles.verificationContainer}>
                        <div className={componentStyles.warningIcon}>
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="#F59E0B" strokeWidth="2" fill="none"/>
                                <path d="M12 8v4m0 4h.01" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </div>
                        <h2 className={componentStyles.verificationTitle}>Verification Link Expired</h2>
                        <p className={componentStyles.verificationMessage}>{message}</p>
                        <div className={componentStyles.verificationActions}>
                            <Link href="/Login" className={componentStyles.linkButton}>
                                Go to Login
                            </Link>
                        </div>
                        <p className={componentStyles.verificationNote}>
                            Please contact support or try logging in to request a new verification link.
                        </p>
                    </div>
                );

            case 'error':
                return (
                    <div className={componentStyles.verificationContainer}>
                        <div className={componentStyles.errorIcon}>
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2" fill="none"/>
                                <path d="M15 9l-6 6m0-6l6 6" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </div>
                        <h2 className={componentStyles.verificationTitle}>Verification Failed</h2>
                        <p className={componentStyles.verificationMessage}>{message}</p>
                        <div className={componentStyles.verificationActions}>
                            <Link href="/SignUp" className={componentStyles.linkButton}>
                                Sign Up Again
                            </Link>
                            <Link href="/Contact" className={componentStyles.linkButtonSecondary}>
                                Contact Support
                            </Link>
                        </div>
                    </div>
                );
        }
    };

    return (
        <>
            <Head>
                <title>Email Verification - BMetrics</title>
            </Head>
            <Header />
            <main className={componentStyles.pageContainer}>
                <div className={componentStyles.verificationWrapper}>
                    {renderContent()}
                </div>
            </main>
            <Footer />
        </>
    );
};

const VerifyEmailPage: React.FC = () => {
    return (
        <Suspense fallback={<Loading />}>
            <VerifyEmailContent />
        </Suspense>
    );
};

export default VerifyEmailPage;
