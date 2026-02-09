"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../../../styles/components.module.scss';
import Header from '../../../../components/header';
import Loading from '../../../../components/loading';
import Button from '../../../../components/Button';
import InputFields from '../../../../components/Inputfield';
import { useAuth } from '../../../../hooks/useAuth';
import { debounceAsync } from '../../../../function/debounce';
import { api } from '../../../../lib/Api';
import type { CreateHomeRequest, CreateHomeResponse } from '../../../../dto';

const AddHome: React.FC = () => {
    const navigate = useRouter();
    const { isReady, isLoggedIn, isAdmin } = useAuth();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    
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

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = (): string | null => {
        if (!formData.homeName.trim()) return 'Home name is required';
        if (!formData.address.trim()) return 'Address is required';
        if (!formData.city.trim()) return 'City is required';
        if (!formData.state.trim()) return 'State is required';
        if (!formData.zip.trim()) return 'ZIP code is required';
        if (formData.zip.trim().length < 5) return 'ZIP code must be at least 5 characters';
        if (!formData.capacity.trim()) return 'Capacity is required';
        const capacity = parseInt(formData.capacity);
        if (isNaN(capacity) || capacity <= 0) return 'Capacity must be a positive number';
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
            const requestData: CreateHomeRequest = {
                homeName: formData.homeName.trim(),
                address: formData.address.trim(),
                city: formData.city.trim(),
                state: formData.state.trim(),
                zip: formData.zip.trim(),
                capacity: parseInt(formData.capacity),
                companyID: formData.companyID
            };

            const response = await api<CreateHomeResponse>('post', '/admin/createHome', requestData);
            
            if ((response as any).statusCode === 200) {
                setStatusMessage('Home created successfully!');
                setTimeout(() => navigate.push('/Admin/manageHomes'), 2000);
            } else {
                throw new Error((response as any).serverMessage || 'Failed to create home');
            }
        } catch (error) {
            setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
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
                    {isLoading ? (
                        <Loading />
                    ) : (
                        <form className={componentStyles.bodyBlock} onSubmit={(e) => { e.preventDefault(); debounceAsync(handleSubmit, 300)(); }}>
                            <h1 className={componentStyles.pageHeader}>Add New Home</h1>
                            <div className={componentStyles.tbHRSButtons}>
                                <Button nameOfClass='tbBackButton' placeholder='Back' btnType='button' isLoading={isLoading} onClick={() => navigate.back()} />
                            </div>
                            
                            <div className={componentStyles.innerForm}>
                                <h2 className={componentStyles.sectionHeader}>Home Information</h2>
                                
                                <InputFields
                                    name="homeName"
                                    type="text"
                                    placeholder="Home Name"
                                    requiring={true}
                                    value={formData.homeName}
                                    onChange={(e) => handleInputChange('homeName', e.target.value)}
                                />
                                
                                <InputFields
                                    name="address"
                                    type="text"
                                    placeholder="Street Address"
                                    requiring={true}
                                    value={formData.address}
                                    onChange={(e) => handleInputChange('address', e.target.value)}
                                />
                                
                                <InputFields
                                    name="city"
                                    type="text"
                                    placeholder="City"
                                    requiring={true}
                                    value={formData.city}
                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                />
                                
                                <InputFields
                                    name="state"
                                    type="text"
                                    placeholder="State"
                                    requiring={true}
                                    value={formData.state}
                                    onChange={(e) => handleInputChange('state', e.target.value)}
                                />
                                
                                <InputFields
                                    name="zip"
                                    type="text"
                                    placeholder="ZIP Code"
                                    requiring={true}
                                    value={formData.zip}
                                    onChange={(e) => handleInputChange('zip', e.target.value)}
                                />
                                
                                <InputFields
                                    name="capacity"
                                    type="number"
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
                                    onClick={(e) => { e.preventDefault(); }}
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

export default AddHome;
