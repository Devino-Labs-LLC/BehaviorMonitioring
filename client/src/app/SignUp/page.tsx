"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import componentStyles from '../../styles/components.module.scss';
import Header from '../../components/header';
import Footer from '../../components/footer';
import InputFields from '../../components/Inputfield';
import Button from '../../components/Button';
import Loading from '../../components/loading';
import { GetLoggedInUserStatus } from '../../function/VerificationCheck';
import { debounceAsync } from '../../function/debounce';
import { api } from '../../lib/Api';
import type { SignUpRequest, SignUpResponse } from '../../dto';

const SignUpPage: React.FC = () => {
    const navigate = useRouter();
    const [userStatus, setUserStatus] = useState<boolean>(GetLoggedInUserStatus());
    const [firstName, setFirstName] = useState<string>('');
    const [lastName, setLastName] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [phoneNumber, setPhoneNumber] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [companyName, setCompanyName] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [signupSuccess, setSignupSuccess] = useState<boolean>(false);

    useEffect(() => {
        if (userStatus) {
            navigate.push('/');
        }
    }, [userStatus, navigate]);

    // Don't render anything if user is logged in (redirect in progress)
    if (userStatus) {
        return null;
    }

    const validateForm = (): string | null => {
        if (!firstName.trim()) return 'First name is required';
        if (!lastName.trim()) return 'Last name is required';
        if (!username.trim()) return 'Username is required';
        if (!email.trim()) return 'Email is required';
        if (!password) return 'Password is required';
        if (!confirmPassword) return 'Please confirm your password';
        if (!companyName.trim()) return 'Company name is required';

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return 'Please enter a valid email address';
        }

        // Username validation (alphanumeric and underscore only)
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return 'Username must be 3-20 characters and contain only letters, numbers, and underscores';
        }

        // Password validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            return 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number';
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return 'Passwords do not match';
        }

        return null;
    };

    const submitSignUpForm = React.useCallback(async () => {
        setIsLoading(true);
        setStatusMessage('');

        // Validate form
        const validationError = validateForm();
        if (validationError) {
            setIsLoading(false);
            return setStatusMessage(validationError);
        }

        try {
            const requestData: SignUpRequest = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                username: username.trim(),
                email: email.trim().toLowerCase(),
                phoneNumber: phoneNumber.trim() || undefined,
                password,
                confirmPassword,
                companyName: companyName.trim()
            };

            const response = await api<SignUpResponse>('post', '/auth/signup', requestData);

            if (response.statusCode === 201 && response.signupSuccess) {
                setSignupSuccess(true);
                setStatusMessage(response.message || 'Registration successful! Your account is pending admin approval.');
            } else {
                throw new Error(response.serverMessage || 'Sign up failed');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setStatusMessage(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [firstName, lastName, username, email, phoneNumber, password, confirmPassword, companyName]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitSignUpForm();
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !signupSuccess) {
                e.preventDefault();
                debounceAsync(submitSignUpForm, 300)();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [submitSignUpForm, signupSuccess]);

    if (signupSuccess) {
        return (
            <>
                <Header />
                <Head>
                    <title>Sign Up Success - BMetrics</title>
                </Head>
                <div className={componentStyles.pageBody}>
                    <main>
                        <div className={componentStyles.loginForm}>
                            <h2>Registration Successful!</h2>
                            <p className={componentStyles.successMessage}>
                                {statusMessage}
                            </p>
                            <p className={componentStyles.infoMessage}>
                                You will receive an email notification once your account has been approved by an administrator.
                            </p>
                            <Link href="/Login">
                                <Button 
                                    nameOfClass="submitButton" 
                                    placeholder="Go to Login" 
                                    btnType="button"
                                    onClick={() => {}}
                                />
                            </Link>
                        </div>
                    </main>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            <Head>
                <title>Sign Up - BMetrics</title>
            </Head>
            <div className={componentStyles.pageBody}>
                <main>
                    {isLoading ? (
                        <Loading />
                    ) : (
                        <form className={componentStyles.loginForm} onSubmit={handleSubmit}>
                            <h2>Create Account</h2>
                            
                            <div className={componentStyles.formRow}>
                                <InputFields 
                                    name="firstNameField" 
                                    type="text" 
                                    placeholder="First Name" 
                                    requiring={true} 
                                    value={firstName} 
                                    onChange={(e) => setFirstName(e.target.value)}
                                />
                                <InputFields 
                                    name="lastNameField" 
                                    type="text" 
                                    placeholder="Last Name" 
                                    requiring={true} 
                                    value={lastName} 
                                    onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>

                            <InputFields 
                                name="usernameField" 
                                type="text" 
                                placeholder="Username" 
                                requiring={true} 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)}
                            />

                            <InputFields 
                                name="emailField" 
                                type="email" 
                                placeholder="Email" 
                                requiring={true} 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)}
                            />

                            <InputFields 
                                name="phoneField" 
                                type="tel" 
                                placeholder="Phone Number (Optional)" 
                                requiring={false} 
                                value={phoneNumber} 
                                onChange={(e) => setPhoneNumber(e.target.value)}
                            />

                            <InputFields 
                                name="companyField" 
                                type="text" 
                                placeholder="Company Name" 
                                requiring={true} 
                                value={companyName} 
                                onChange={(e) => setCompanyName(e.target.value)}
                            />

                            <InputFields 
                                name="passwordField" 
                                type="password" 
                                placeholder="Password" 
                                requiring={true} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <InputFields 
                                name="confirmPasswordField" 
                                type="password" 
                                placeholder="Confirm Password" 
                                requiring={true} 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />

                            {statusMessage && (
                                <p className={componentStyles.errorMessage}>{statusMessage}</p>
                            )}

                            <Button 
                                nameOfClass="submitButton" 
                                placeholder="Sign Up" 
                                btnType="submit"
                                isLoading={isLoading}
                                onClick={handleSubmit}
                                data-testid="signup-submit-button"
                            />

                            <div className={componentStyles.linkContainer}>
                                <p>
                                    Already have an account?{' '}
                                    <Link href="/Login">Login here</Link>
                                </p>
                            </div>
                        </form>
                    )}
                </main>
            </div>
            <Footer />
        </>
    );
};

export default SignUpPage;
