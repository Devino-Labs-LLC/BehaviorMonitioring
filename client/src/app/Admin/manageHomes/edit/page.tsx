"use client";
import React, { useState, useEffect, Suspense } from 'react';
import Head from 'next/head';
import { useRouter, useSearchParams } from 'next/navigation';
import componentStyles from '../../../../styles/components.module.scss';
import Header from '../../../../components/header';
import Loading from '../../../../components/loading';
import Button from '../../../../components/Button';
import InputFields from '../../../../components/Inputfield';
import Checkbox from '../../../../components/Checkbox';
import { useAuth } from '../../../../hooks/useAuth';
import { debounceAsync } from '../../../../function/debounce';
import { api } from '../../../../lib/Api';
import type { UpdateHomeResponse, GetHomesResponse } from '../../../../dto';

const EditHomeContent: React.FC = () => {
    const navigate = useRouter();
    const searchParams = useSearchParams();
    const homeID = searchParams.get('homeID');
    const { isReady, isLoggedIn, isAdmin, username } = useAuth();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [statusMessage, setStatusMessage] = useState<string>('');
    
    const [formData, setFormData] = useState({
        homeID: 0,
        homeName: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        capacity: '',
        isActive: true
    });

    useEffect(() => {
        if (!isReady) return;

        if (!isLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
        } else if (!isAdmin) {
            navigate.push('/');
        } else if (homeID) {
            fetchHomeData();
        } else {
            navigate.push('/Admin/manageHomes');
        }
    }, [isReady, isLoggedIn, isAdmin, homeID, navigate]);

    const fetchHomeData = async () => {
        setIsLoading(true);
        try {
            if (!username) {
                setStatusMessage('Unable to identify the current user. Please log in again.');
                return;
            }

            const response = await api<GetHomesResponse>('post', '/admin/getAllHomes', {
                employeeUsername: username
            });
            if ((response as any).statusCode === 200) {
                const home = response.homes.find(h => h.homeID === Number.parseInt(homeID ?? '', 10));
                if (home) {
                    setFormData({
                        homeID: home.homeID,
                        homeName: home.homeName,
                        address: home.address,
                        city: home.city,
                        state: home.state,
                        zip: home.zip,
                        capacity: home.capacity.toString(),
                        isActive: home.isActive
                    });
                } else {
                    setStatusMessage('Home not found');
                }
            } else {
                throw new Error((response as any).serverMessage || 'Failed to fetch home data');
            }
        } catch (error) {
            setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = (): string | null => {
        if (!formData.homeName.trim()) return 'Home name is required';
        if (!formData.address.trim()) return 'Address is required';
        if (!formData.city.trim()) return 'City is required';
        if (!formData.state.trim()) return 'State is required';
        if (!/^[a-zA-Z]{2}$/.test(formData.state.trim())) return 'State must be a 2-letter code (for example, NY)';
        if (!formData.zip.trim()) return 'ZIP code is required';
        if (formData.zip.trim().length < 5) return 'ZIP code must be at least 5 characters';
        if (!formData.capacity.trim()) return 'Capacity is required';
        const capacity = Number.parseInt(formData.capacity, 10);
        if (Number.isNaN(capacity) || capacity <= 0) return 'Capacity must be a positive number';
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

        if (!username) {
            setStatusMessage('Unable to identify the current user. Please log in again.');
            setIsLoading(false);
            return;
        }

        try {
                const requestData = {
                    homeID: formData.homeID,
                    name: formData.homeName.trim(),
                    streetAddress: formData.address.trim(),
                    city: formData.city.trim(),
                    state: formData.state.trim().toUpperCase(),
                    zipCode: formData.zip.trim(),
                    capacity: Number.parseInt(formData.capacity, 10),
                    employeeUsername: username
                };

            const response = await api<UpdateHomeResponse>('post', '/admin/updateAHome', requestData);
            
                if ((response as any).statusCode === 201) {
                setStatusMessage('Home updated successfully!');
                setTimeout(() => navigate.push('/Admin/manageHomes'), 2000);
            } else {
                throw new Error((response as any).serverMessage || 'Failed to update home');
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
                <title>Edit Home - BMetrics</title>
            </Head>
            <div className={componentStyles.pageBody}>
                <main>
                    {isLoading ? (
                        <Loading />
                    ) : (
                        <form className={componentStyles.bodyBlock} onSubmit={(e) => { e.preventDefault(); debounceAsync(handleSubmit, 300)(); }}>
                            <h1 className={componentStyles.pageHeader}>Edit Home</h1>
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
                                
                                <div className={componentStyles.checkboxContainer}>
                                    <Checkbox
                                        nameOfClass=""
                                        label="Active Status"
                                        isChecked={formData.isActive}
                                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                        disabled={false}
                                    />
                                    <span>Home is {formData.isActive ? 'Active' : 'Archived'}</span>
                                </div>
                                
                                <Button 
                                    nameOfClass='submitButton' 
                                    placeholder='Update Home' 
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

export default function EditHome() {
    return (
        <Suspense fallback={<Loading />}>
            <EditHomeContent />
        </Suspense>
    );
}
