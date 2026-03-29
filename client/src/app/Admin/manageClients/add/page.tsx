"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../../../styles/components.module.scss';
import Header from '../../../../components/header';
import Loading from '../../../../components/loading';
import Button from '../../../../components/Button';
import InputFields from '../../../../components/Inputfield';
import Datefield from '../../../../components/Datefield';
import Selectdropdown from '../../../../components/Selectdropdown';
import TextareaInput from '../../../../components/TextareaInput';
import ConfirmActionModal from '../../../../components/ConfirmActionModal';
import { useAuth } from '../../../../hooks/useAuth';
import { debounceAsync } from '../../../../function/debounce';
import { api } from '../../../../lib/Api';
import type { CreateClientRequest, CreateClientResponse } from '../../../../dto';

const getErrorMessage = (error: unknown): string => {
    const e = error as any;
    return e?.response?.data?.serverMessage || e?.response?.data?.message || (error instanceof Error ? error.message : String(error));
};

const AddClient: React.FC = () => {
    const navigate = useRouter();
    const { isReady, isLoggedIn, isAdmin, username } = useAuth();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    const [homes, setHomes] = useState<{value: number; label: string}[]>([]);
    
    const [formData, setFormData] = useState<{
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        homeID: number | '';
        intakeDate: string;
        medicaidIdNumber: string;
        behaviorPlanDueDate: string;
        guardianName: string;
        guardianPhone: string;
        guardianEmail: string;
        allergies: string;
        medications: string;
        notes: string;
        companyID: number;
    }>({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        homeID: '',
        intakeDate: '',
        medicaidIdNumber: '',
        behaviorPlanDueDate: '',
        guardianName: '',
        guardianPhone: '',
        guardianEmail: '',
        allergies: '',
        medications: '',
        notes: '',
        companyID: 1
    });

    useEffect(() => {
        // Wait for auth to be ready before checking login status
        if (!isReady) return;

        if (!isLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
        } else if (!isAdmin) {
            navigate.push('/');
        } else if (username) {
            fetchHomes();
        }
    }, [isReady, isLoggedIn, isAdmin, username, navigate]);

    const canRenderForm = isReady && isLoggedIn && isAdmin;

    const fetchHomes = async () => {
        try {
            if (!username) {
                setStatusMessage('Unable to load homes until the current user is available.');
                return;
            }

            const response = await api<any>('post', '/admin/getAllHomes', {
                employeeUsername: username
            });
            if (response.statusCode === 200) {
                const homeOptions = response.homes.map((home: any) => ({
                    value: home.homeID,
                    label: home.homeName
                }));
                setHomes(homeOptions);
                setStatusMessage('');
            } else {
                throw new Error(response.serverMessage || 'Failed to fetch homes');
            }
        } catch (error) {
            console.error('Failed to fetch homes:', error);
            setHomes([]);
            setStatusMessage(getErrorMessage(error));
        }
    };

    const handleInputChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = (): string | null => {
        if (!formData.firstName.trim()) return 'First name is required';
        if (!formData.lastName.trim()) return 'Last name is required';
        if (!formData.dateOfBirth) return 'Date of birth is required';
        if (formData.homeID === '') return 'Please select a home';
        if (!formData.intakeDate) return 'Intake date is required';
        if (!formData.medicaidIdNumber.trim()) return 'Medicaid ID is required';
        if (!formData.behaviorPlanDueDate) return 'Behavior plan due date is required';
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
            if (!username) {
                setStatusMessage('Unable to identify the current user. Please log in again.');
                setIsLoading(false);
                return;
            }

            // Find the home name from the homeID
            const selectedHome = homes.find(h => h.value === formData.homeID);
            const groupHomeName = selectedHome ? selectedHome.label : '';

            const requestData: CreateClientRequest = {
                fName: formData.firstName.trim(),
                lName: formData.lastName.trim(),
                DOB: formData.dateOfBirth,
                intakeDate: formData.intakeDate,
                groupHomeName: groupHomeName,
                medicaidIdNumber: formData.medicaidIdNumber.trim(),
                behaviorPlanDueDate: formData.behaviorPlanDueDate,
                employeeUsername: username
            };

            const response = await api<CreateClientResponse>('post', '/admin/createClient', requestData);
            
            if (response.statusCode === 201) {
                setStatusMessage('Client created successfully!');
                setTimeout(() => navigate.push('/Admin/manageClients'), 2000);
            } else {
                throw new Error(response.serverMessage || 'Failed to create client');
            }
        } catch (error) {
            setStatusMessage(getErrorMessage(error));
        } finally {
            setIsLoading(false);
            setShowConfirmModal(false);
        }
    };

    const handlePreSubmit = async () => {
        const validationError = validateForm();
        if (validationError) {
            setStatusMessage(validationError);
            return;
        }

        setStatusMessage('');
        setShowConfirmModal(true);
    };

    return (
        <>
            <Header />
            <Head>
                <title>Add Client - BMetrics</title>
            </Head>
            <div className={componentStyles.pageBody}>
                <main>
                    {!canRenderForm || isLoading ? (
                        <Loading />
                    ) : (
                        <form className={componentStyles.bodyBlock} onSubmit={(e) => { e.preventDefault(); debounceAsync(handlePreSubmit, 300)(); }}>
                            <h1 className={componentStyles.pageHeader}>Add New Client</h1>
                            <div className={componentStyles.tbHRSButtons}>
                                <Button nameOfClass='tbBackButton' placeholder='Back' btnType='button' isLoading={isLoading} onClick={() => navigate.back()} />
                            </div>
                            
                            <div className={componentStyles.innerForm}>
                                <h2 className={componentStyles.sectionHeader}>Client Information</h2>
                                
                                <InputFields
                                    name="firstName"
                                    type="text"
                                    label="First Name"
                                    placeholder="First Name"
                                    requiring={true}
                                    value={formData.firstName}
                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                />
                                
                                <InputFields
                                    name="lastName"
                                    type="text"
                                    label="Last Name"
                                    placeholder="Last Name"
                                    requiring={true}
                                    value={formData.lastName}
                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                />
                                
                                <Datefield
                                    name="dateOfBirth"
                                    label="Date of Birth"
                                    requiring={true}
                                    value={formData.dateOfBirth}
                                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                                />
                                
                                <Selectdropdown
                                    name="homeID"
                                    label="Home"
                                    options={homes}
                                    value={formData.homeID}
                                    placeholderOption="Select a home"
                                    onChange={(e) => handleInputChange('homeID', e.target.value ? parseInt(e.target.value, 10) : '')}
                                    requiring={true}
                                />
                                
                                <Datefield
                                    name="intakeDate"
                                    label="Intake Date"
                                    requiring={true}
                                    value={formData.intakeDate}
                                    onChange={(e) => handleInputChange('intakeDate', e.target.value)}
                                />
                                
                                <InputFields
                                    name="medicaidIdNumber"
                                    type="text"
                                    label="Medicaid ID Number"
                                    placeholder="Medicaid ID Number"
                                    requiring={true}
                                    value={formData.medicaidIdNumber}
                                    onChange={(e) => handleInputChange('medicaidIdNumber', e.target.value)}
                                />
                                
                                <Datefield
                                    name="behaviorPlanDueDate"
                                    label="Behavior Plan Due Date"
                                    requiring={true}
                                    value={formData.behaviorPlanDueDate}
                                    onChange={(e) => handleInputChange('behaviorPlanDueDate', e.target.value)}
                                />
                                
                                <h2 className={componentStyles.sectionHeader}>Guardian Information</h2>
                                
                                <InputFields
                                    name="guardianName"
                                    type="text"
                                    label="Guardian Name"
                                    placeholder="Guardian Name (Optional)"
                                    requiring={false}
                                    value={formData.guardianName}
                                    onChange={(e) => handleInputChange('guardianName', e.target.value)}
                                />
                                
                                <InputFields
                                    name="guardianPhone"
                                    type="tel"
                                    label="Guardian Phone"
                                    placeholder="Guardian Phone (Optional)"
                                    requiring={false}
                                    value={formData.guardianPhone}
                                    onChange={(e) => handleInputChange('guardianPhone', e.target.value)}
                                />
                                
                                <InputFields
                                    name="guardianEmail"
                                    type="email"
                                    label="Guardian Email"
                                    placeholder="Guardian Email (Optional)"
                                    requiring={false}
                                    value={formData.guardianEmail}
                                    onChange={(e) => handleInputChange('guardianEmail', e.target.value)}
                                />
                                
                                <h2 className={componentStyles.sectionHeader}>Medical & Additional Information</h2>
                                
                                <TextareaInput
                                    name="allergies"
                                    nameOfClass=""
                                    label="Allergies"
                                    placeholder="Allergies (Optional)"
                                    requiring={false}
                                    value={formData.allergies}
                                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                                />
                                
                                <TextareaInput
                                    name="medications"
                                    nameOfClass=""
                                    label="Medications"
                                    placeholder="Medications (Optional)"
                                    requiring={false}
                                    value={formData.medications}
                                    onChange={(e) => handleInputChange('medications', e.target.value)}
                                />
                                
                                <TextareaInput
                                    name="notes"
                                    nameOfClass=""
                                    label="Additional Notes"
                                    placeholder="Additional Notes (Optional)"
                                    requiring={false}
                                    value={formData.notes}
                                    onChange={(e) => handleInputChange('notes', e.target.value)}
                                />
                                
                                <Button 
                                    nameOfClass='submitButton' 
                                    placeholder='Create Client' 
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
                title="Create Client"
                message="Please confirm the client details are correct before creating this client record."
                confirmLabel="Create Client"
                cancelLabel="Review"
                isSubmitting={isLoading}
                onConfirm={handleSubmit}
                onCancel={() => setShowConfirmModal(false)}
            />
        </>
    );
};

export default AddClient;
