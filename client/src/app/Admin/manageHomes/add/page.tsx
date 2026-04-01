"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../../../styles/components.module.scss';
import Header from '../../../../components/header';
import Loading from '../../../../components/loading';
import Button from '../../../../components/Button';
import InputFields from '../../../../components/Inputfield';
import ConfirmActionModal from '../../../../components/ConfirmActionModal';
import { useAuth } from '../../../../hooks/useAuth';
import { debounceAsync } from '../../../../function/debounce';
import { api } from '../../../../lib/Api';
import type { CreateHomeResponse } from '../../../../dto';

const getErrorMessage = (error: unknown): string => {
    const e = error as any;
    return e?.response?.data?.serverMessage || e?.response?.data?.message || (error instanceof Error ? error.message : String(error));
};

const AddHome: React.FC = () => {
    const navigate = useRouter();
    const { isReady, isLoggedIn, isAdmin, username } = useAuth();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    
    const [formData, setFormData] = useState({
        homeName: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        capacity: '',
        companyID: 1
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

    const canRenderForm = isReady && isLoggedIn && isAdmin;

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = (): string | null => {
        if (!formData.homeName.trim()) return 'Home name is required';
        if (!formData.address.trim()) return 'Address is required';
        if (!formData.city.trim()) return 'City is required';
        if (!formData.state.trim()) return 'State is required';
        if (!/^[a-zA-Z]{2}$/.test(formData.state.trim())) return 'State must be a 2-letter code (for example, NY)';
        if (!formData.zip.trim()) return 'ZIP code is required';
        if (!/^\d{5}(-\d{4})?$/.test(formData.zip.trim())) return 'ZIP code must be 5 digits or ZIP+4 format';
        if (!formData.capacity.trim()) return 'Capacity is required';
        const capacity = Number.parseInt(formData.capacity, 10);
        if (Number.isNaN(capacity) || capacity <= 0) return 'Capacity must be a positive number';
        return null;
    };

    const handlePreSubmit = () => {
        const validationError = validateForm();
        if (validationError) {
            setStatusMessage(validationError);
            return;
        }

        setStatusMessage('');
        setShowConfirmModal(true);
    };

    const handleSubmit = async () => {
        const validationError = validateForm();
        if (validationError) {
            setStatusMessage(validationError);
            return;
        }

        setIsLoading(true);
        setStatusMessage('');

        if (!username) {
            setStatusMessage('Unable to identify the current user. Please log in again.');
            setIsLoading(false);
            return;
        }

        try {
            const requestData = {
                name: formData.homeName.trim(),
                streetAddress: formData.address.trim(),
                city: formData.city.trim(),
                state: formData.state.trim().toUpperCase(),
                zipCode: formData.zip.trim(),
                capacity: Number.parseInt(formData.capacity, 10),
                employeeUsername: username
            };

            const response = await api<CreateHomeResponse>('post', '/admin/addNewHome', requestData);
            
            if ((response as any).statusCode === 201) {
                setStatusMessage('Home created successfully!');
                setTimeout(() => navigate.push('/Admin/manageHomes'), 2000);
            } else {
                throw new Error((response as any).serverMessage || 'Failed to create home');
            }
        } catch (error) {
            setStatusMessage(getErrorMessage(error));
        } finally {
            setIsLoading(false);
            setShowConfirmModal(false);
        }
    };

    return (
        <>
            <Header />
            <Head>
                <title>Add Home - BMetrics</title>
            </Head>
            <div className={componentStyles.pageBody}>
                <main>
                    {!canRenderForm || isLoading ? (
                        <Loading />
                    ) : (
                        <form className={componentStyles.bodyBlock} onSubmit={(e) => { e.preventDefault(); debounceAsync(handlePreSubmit, 300)(); }}>
                            <h1 className={componentStyles.pageHeader}>Add New Home</h1>
                            <div className={componentStyles.tbHRSButtons}>
                                <Button nameOfClass='tbBackButton' placeholder='Back' btnType='button' isLoading={isLoading} onClick={() => navigate.back()} />
                            </div>
                            
                            <div className={componentStyles.innerForm}>
                                <h2 className={componentStyles.sectionHeader}>Home Information</h2>
                                
                                <InputFields
                                    name="homeName"
                                    type="text"
                                    label="Home Name"
                                    placeholder="Home Name"
                                    requiring={true}
                                    value={formData.homeName}
                                    onChange={(e) => handleInputChange('homeName', e.target.value)}
                                />
                                
                                <InputFields
                                    name="address"
                                    type="text"
                                    label="Street Address"
                                    placeholder="Street Address"
                                    requiring={true}
                                    value={formData.address}
                                    onChange={(e) => handleInputChange('address', e.target.value)}
                                />
                                
                                <InputFields
                                    name="city"
                                    type="text"
                                    label="City"
                                    placeholder="City"
                                    requiring={true}
                                    value={formData.city}
                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                />
                                
                                <InputFields
                                    name="state"
                                    type="text"
                                    label="State"
                                    placeholder="State (2-letter code)"
                                    requiring={true}
                                    value={formData.state}
                                    onChange={(e) => handleInputChange('state', e.target.value)}
                                />
                                
                                <InputFields
                                    name="zip"
                                    type="text"
                                    label="ZIP Code"
                                    placeholder="ZIP Code"
                                    requiring={true}
                                    value={formData.zip}
                                    onChange={(e) => handleInputChange('zip', e.target.value)}
                                />
                                
                                <InputFields
                                    name="capacity"
                                    type="number"
                                    label="Capacity"
                                    placeholder="Capacity"
                                    requiring={true}
                                    value={formData.capacity}
                                    onChange={(e) => handleInputChange('capacity', e.target.value)}
                                />
                                
                                <Button 
                                    nameOfClass='submitButton' 
                                    placeholder='Create Home' 
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
            <ConfirmActionModal
                isVisible={showConfirmModal}
                title="Create Home"
                message="Please confirm the home details are correct before creating this home."
                confirmLabel="Create Home"
                cancelLabel="Review"
                isSubmitting={isLoading}
                onConfirm={handleSubmit}
                onCancel={() => setShowConfirmModal(false)}
            />
        </>
    );
};

export default AddHome;
