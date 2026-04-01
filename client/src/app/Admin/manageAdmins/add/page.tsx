"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../../../styles/components.module.scss';
import Header from '../../../../components/header';
import Loading from '../../../../components/loading';
import Button from '../../../../components/Button';
import InputFields from '../../../../components/Inputfield';
import Selectdropdown from '../../../../components/Selectdropdown';
import { CheckEmail } from '../../../../function/EntryCheck';
import { GetLoggedInUser } from '../../../../function/VerificationCheck';
import { useAuth } from '../../../../hooks/useAuth';
import { api } from '../../../../lib/Api';
import type { CreateAdminResponse } from '../../../../dto';

const AddAdmin: React.FC = () => {
    const navigate = useRouter();
    const { isReady, isLoggedIn, isAdmin } = useAuth();
    const loggedInUser = GetLoggedInUser();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'admin' as 'root' | 'admin' | 'manager'
    });

    useEffect(() => {
        if (!isReady) return;
        if (!isLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
        } else if (!isAdmin) {
            navigate.push('/');
        }
    }, [isReady, isLoggedIn, isAdmin, navigate]);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = (): string | null => {
        if (!formData.firstName.trim()) return 'First name is required';
        if (!formData.lastName.trim()) return 'Last name is required';
        if (!formData.email.trim()) return 'Email is required';
        if (!CheckEmail(formData.email)) return 'Invalid email format';
        return null;
    };

    const handleSubmit = async () => {
        const validationError = validateForm();
        if (validationError) {
            setStatusMessage(validationError);
            return;
        }

        setIsLoading(true);
        setStatusMessage('');

        try {
            const response = await api<CreateAdminResponse>('post', '/admin/addNewEmployee', {
                fName: formData.firstName.trim(),
                lName: formData.lastName.trim(),
                email: formData.email.trim().toLowerCase(),
                pNumber: formData.phone.trim() || '',
                role: formData.role,
                accountStatus: 'Active',
                employeeUsername: loggedInUser
            });
            
            if (response.statusCode === 201) {
                setStatusMessage('Admin created successfully! A verification email will be sent to set up their password.');
                setTimeout(() => navigate.push('/Admin/manageAdmins'), 3000);
            } else {
                throw new Error(response.serverMessage || 'Failed to create admin');
            }
        } catch (error) {
            setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const roleOptions = [
        { value: 'admin', label: 'Admin' },
        { value: 'manager', label: 'Manager' },
        { value: 'root', label: 'Root' }
    ];

    return (
        <>
            <Header />
            <Head>
                <title>Add Admin - BMetrics</title>
            </Head>
            <div className={componentStyles.pageBody}>
                <main>
                    {isLoading ? (
                        <Loading />
                    ) : (
                        <form className={componentStyles.bodyBlock} onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                            <h1 className={componentStyles.pageHeader}>Add New Admin</h1>
                            <div className={componentStyles.tbHRSButtons}>
                                <Button nameOfClass='tbBackButton' placeholder='Back' btnType='button' isLoading={isLoading} onClick={() => navigate.back()} />
                            </div>
                            
                            <div className={componentStyles.innerForm}>
                                <h2 className={componentStyles.sectionHeader}>Admin Information</h2>
                                
                                <InputFields
                                    name="firstName"
                                    type="text"
                                    label="First Name"
                                    placeholder="First Name"
                                    requiring={false}
                                    value={formData.firstName}
                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                />
                                
                                <InputFields
                                    name="lastName"
                                    type="text"
                                    label="Last Name"
                                    placeholder="Last Name"
                                    requiring={false}
                                    value={formData.lastName}
                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                />
                                
                                <InputFields
                                    name="email"
                                    type="text"
                                    label="Email Address"
                                    placeholder="Email Address"
                                    requiring={false}
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                />
                                
                                <InputFields
                                    name="phone"
                                    type="tel"
                                    label="Phone Number"
                                    placeholder="Phone Number (Optional)"
                                    requiring={false}
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                />
                                
                                <Selectdropdown
                                    name="role"
                                    label="Role"
                                    options={roleOptions}
                                    value={formData.role}
                                    onChange={(e) => handleInputChange('role', e.target.value)}
                                    requiring={false}
                                />
                                
                                <Button 
                                    nameOfClass='submitButton' 
                                    placeholder='Create Admin' 
                                    btnType='submit' 
                                    isLoading={isLoading}
                                    onClick={() => {}}
                                />
                                
                                <p className={componentStyles.statusMessage}>{statusMessage}</p>
                            </div>
                        </form>
                    )}
                </main>
            </div>
        </>
    );
};

export default AddAdmin;
