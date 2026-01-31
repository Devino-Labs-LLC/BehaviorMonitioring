"use client";
import React, { useState, useEffect, Suspense } from 'react';
import Head from 'next/head';
import { useRouter, useSearchParams } from 'next/navigation';
import componentStyles from '../../../../styles/components.module.scss';
import Header from '../../../../components/header';
import Loading from '../../../../components/loading';
import Button from '../../../../components/Button';
import InputFields from '../../../../components/Inputfield';
import Datefield from '../../../../components/Datefield';
import Selectdropdown from '../../../../components/Selectdropdown';
import TextareaInput from '../../../../components/TextareaInput';
import Checkbox from '../../../../components/Checkbox';
import { GetLoggedInUserStatus, GetAdminStatus } from '../../../../function/VerificationCheck';
import { debounceAsync } from '../../../../function/debounce';
import { api } from '../../../../lib/Api';
import type { UpdateClientRequest, UpdateClientResponse, GetAllClientsResponse } from '../../../../dto';

const EditClientContent: React.FC = () => {
    const navigate = useRouter();
    const searchParams = useSearchParams();
    const clientID = searchParams.get('clientID');
    const userLoggedIn = GetLoggedInUserStatus();
    const userIsAdmin = GetAdminStatus();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [homes, setHomes] = useState<{value: number; label: string}[]>([]);
    
    const [formData, setFormData] = useState({
        clientID: 0,
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        homeID: 0,
        guardianName: '',
        guardianPhone: '',
        guardianEmail: '',
        allergies: '',
        medications: '',
        notes: '',
        isActive: true,
        companyID: 1
    });

    useEffect(() => {
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
        } else if (!userIsAdmin) {
            navigate.push('/');
        } else if (clientID) {
            fetchHomes();
            fetchClientData();
        } else {
            navigate.push('/Admin/manageClients');
        }
    }, [userLoggedIn, userIsAdmin, clientID]);

    const fetchHomes = async () => {
        try {
            const response = await api<any>('post', '/admin/getAllHomes', {});
            if (response.statusCode === 200) {
                const homeOptions = response.homes.map((home: any) => ({
                    value: home.homeID,
                    label: home.homeName
                }));
                setHomes(homeOptions);
            }
        } catch (error) {
            console.error('Failed to fetch homes:', error);
            setHomes([{ value: 1, label: 'Main Home' }]);
        }
    };

    const fetchClientData = async () => {
        setIsLoading(true);
        try {
            const response = await api<GetAllClientsResponse>('post', '/aba/getAllClientInfo', {});
            if (response.statusCode === 200) {
                const client = response.clientData.find((c: any) => c.clientID === parseInt(clientID!));
                if (client) {
                    setFormData({
                        clientID: client.clientID,
                        firstName: client.fName,
                        lastName: client.lName,
                        dateOfBirth: (client as any).dateOfBirth,
                        homeID: (client as any).homeID || 0,
                        guardianName: (client as any).guardianName,
                        guardianPhone: (client as any).guardianPhone,
                        guardianEmail: (client as any).guardianEmail,
                        allergies: (client as any).allergies,
                        medications: (client as any).medications,
                        notes: (client as any).notes,
                        isActive: (client as any).isActive !== false,
                        companyID: client.companyID || 1
                    });
                } else {
                    setStatusMessage('Client not found');
                }
            } else {
                throw new Error(response.serverMessage || 'Failed to fetch client data');
            }
        } catch (error) {
            setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string | number | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = (): string | null => {
        if (!formData.firstName.trim()) return 'First name is required';
        if (!formData.lastName.trim()) return 'Last name is required';
        if (!formData.dateOfBirth) return 'Date of birth is required';
        if (!formData.homeID || formData.homeID === 0) return 'Please select a home';
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
            const requestData: UpdateClientRequest = {
                clientID: formData.clientID,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                dateOfBirth: formData.dateOfBirth,
                homeID: formData.homeID,
                guardianName: formData.guardianName.trim() || undefined,
                guardianPhone: formData.guardianPhone.trim() || undefined,
                guardianEmail: formData.guardianEmail.trim() || undefined,
                allergies: formData.allergies.trim() || undefined,
                medications: formData.medications.trim() || undefined,
                notes: formData.notes.trim() || undefined,
                isActive: formData.isActive,
                companyID: formData.companyID
            };

            const response = await api<UpdateClientResponse>('post', '/admin/updateClient', requestData);
            
            if (response.statusCode === 200) {
                setStatusMessage('Client updated successfully!');
                setTimeout(() => navigate.push('/Admin/manageClients'), 2000);
            } else {
                throw new Error(response.serverMessage || 'Failed to update client');
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
                <title>Edit Client - BMetrics</title>
            </Head>
            <div className={componentStyles.pageBody}>
                <main>
                    {isLoading ? (
                        <Loading />
                    ) : (
                        <form className={componentStyles.bodyBlock} onSubmit={(e) => { e.preventDefault(); debounceAsync(handleSubmit, 300)(); }}>
                            <h1 className={componentStyles.pageHeader}>Edit Client</h1>
                            <div className={componentStyles.tbHRSButtons}>
                                <Button nameOfClass='tbBackButton' placeholder='Back' btnType='button' isLoading={isLoading} onClick={() => navigate.back()} />
                            </div>
                            
                            <div className={componentStyles.innerForm}>
                                <h2>Client Information</h2>
                                
                                <InputFields
                                    name="firstName"
                                    type="text"
                                    placeholder="First Name"
                                    requiring={true}
                                    value={formData.firstName}
                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                />
                                
                                <InputFields
                                    name="lastName"
                                    type="text"
                                    placeholder="Last Name"
                                    requiring={true}
                                    value={formData.lastName}
                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                />
                                
                                <Datefield
                                    name="dateOfBirth"
                                    requiring={true}
                                    value={formData.dateOfBirth}
                                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                                />
                                
                                <Selectdropdown
                                    name="homeID"
                                    options={homes}
                                    value={formData.homeID}
                                    onChange={(e) => handleInputChange('homeID', parseInt(e.target.value))}
                                    requiring={true}
                                />
                                
                                <h2>Guardian Information</h2>
                                
                                <InputFields
                                    name="guardianName"
                                    type="text"
                                    placeholder="Guardian Name (Optional)"
                                    requiring={false}
                                    value={formData.guardianName}
                                    onChange={(e) => handleInputChange('guardianName', e.target.value)}
                                />
                                
                                <InputFields
                                    name="guardianPhone"
                                    type="tel"
                                    placeholder="Guardian Phone (Optional)"
                                    requiring={false}
                                    value={formData.guardianPhone}
                                    onChange={(e) => handleInputChange('guardianPhone', e.target.value)}
                                />
                                
                                <InputFields
                                    name="guardianEmail"
                                    type="email"
                                    placeholder="Guardian Email (Optional)"
                                    requiring={false}
                                    value={formData.guardianEmail}
                                    onChange={(e) => handleInputChange('guardianEmail', e.target.value)}
                                />
                                
                                <h2>Medical & Additional Information</h2>
                                
                                <TextareaInput
                                    name="allergies"
                                    nameOfClass=""
                                    placeholder="Allergies (Optional)"
                                    requiring={false}
                                    value={formData.allergies}
                                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                                />
                                
                                <TextareaInput
                                    name="medications"
                                    nameOfClass=""
                                    placeholder="Medications (Optional)"
                                    requiring={false}
                                    value={formData.medications}
                                    onChange={(e) => handleInputChange('medications', e.target.value)}
                                />
                                
                                <TextareaInput
                                    name="notes"
                                    nameOfClass=""
                                    placeholder="Additional Notes (Optional)"
                                    requiring={false}
                                    value={formData.notes}
                                    onChange={(e) => handleInputChange('notes', e.target.value)}
                                />
                                
                                <div className={componentStyles.checkboxContainer}>
                                    <Checkbox
                                        nameOfClass=""
                                        label="Active Status"
                                        isChecked={formData.isActive}
                                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                        disabled={false}
                                    />
                                    <span>Client is {formData.isActive ? 'Active' : 'Archived'}</span>
                                </div>
                                
                                <Button 
                                    nameOfClass='submitButton' 
                                    placeholder='Update Client' 
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

export default function EditClient() {
    return (
        <Suspense fallback={<Loading />}>
            <EditClientContent />
        </Suspense>
    );
}
