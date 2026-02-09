"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../../styles/components.module.scss';
import Header from '../../../components/header';
import Loading from '../../../components/loading';
import Button from '../../../components/Button';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../lib/Api';
import type { 
    ArchivedClient, 
    GetArchivedClientsResponse, 
    UnarchiveClientResponse,
    DeleteArchivedClientResponse 
} from '../../../dto';

const ArchivedClients: React.FC = () => {
    const navigate = useRouter();
    const { isReady, isLoggedIn, isAdmin } = useAuth();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [archivedClients, setArchivedClients] = useState<ArchivedClient[]>([]);
    const [selectedClient, setSelectedClient] = useState<ArchivedClient | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
    const [confirmAction, setConfirmAction] = useState<'unarchive' | 'delete' | null>(null);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    useEffect(() => {
        if (!isReady) return;
        if (!isLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
        } else if (!isAdmin) {
            navigate.push('/');
        } else {
            loadArchivedClients();
        }
    }, [isReady, isLoggedIn, isAdmin, navigate]);

    const loadArchivedClients = async () => {
        try {
            setIsLoading(true);
            setError('');
            
               const response: GetArchivedClientsResponse = await api('POST', '/api/admin/getArchivedClients', {});
            
            if (response.statusCode === 200) {
                setArchivedClients(response.archivedClients);
            } else {
                setError(response.serverMessage || 'Failed to load archived clients');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateDaysUntilDeletion = (deletionDate: string): number => {
        const today = new Date();
        const deletion = new Date(deletionDate);
        const diffTime = deletion.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const handleUnarchive = async () => {
        if (!selectedClient) return;

        try {
            setIsLoading(true);
            setError('');
            setSuccess('');

            const response: UnarchiveClientResponse = await api(
                'POST',
                '/api/admin/unarchiveClient',
                { clientID: selectedClient.clientID },
            );

            if (response.statusCode === 200) {
                setSuccess(`${selectedClient.fName} ${selectedClient.lName} has been restored to active status`);
                await loadArchivedClients();
            } else {
                setError(response.serverMessage || 'Failed to unarchive client');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
            setShowConfirmDialog(false);
            setSelectedClient(null);
            setConfirmAction(null);
        }
    };

    const handleDelete = async () => {
        if (!selectedClient) return;

        try {
            setIsLoading(true);
            setError('');
            setSuccess('');

            const response: DeleteArchivedClientResponse = await api(
                'POST',
                '/api/admin/deleteArchivedClient',
                { clientID: selectedClient.clientID },
            );

            if (response.statusCode === 200) {
                setSuccess(`${selectedClient.fName} ${selectedClient.lName}'s data has been permanently deleted`);
                await loadArchivedClients();
            } else {
                setError(response.serverMessage || 'Failed to delete client');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
            setShowConfirmDialog(false);
            setSelectedClient(null);
            setConfirmAction(null);
        }
    };

    const openConfirmDialog = (client: ArchivedClient, action: 'unarchive' | 'delete') => {
        setSelectedClient(client);
        setConfirmAction(action);
        setShowConfirmDialog(true);
    };

    const closeConfirmDialog = () => {
        setShowConfirmDialog(false);
        setSelectedClient(null);
        setConfirmAction(null);
    };

    const handleConfirm = () => {
        if (confirmAction === 'unarchive') {
            handleUnarchive();
        } else if (confirmAction === 'delete') {
            handleDelete();
        }
    };

    const getDeletionStatusClass = (daysRemaining: number): string => {
        if (daysRemaining <= 30) return componentStyles.statusCritical;
        if (daysRemaining <= 60) return componentStyles.statusWarning;
        if (daysRemaining <= 90) return componentStyles.statusCaution;
        return componentStyles.statusNormal;
    };

    return (
        <>
            <Header />
            <Head>
                <title>Archived Clients - BMetrics</title>
            </Head>
            <div className={componentStyles.pageBody}>
                <main>
                    {isLoading ? (
                        <Loading />
                    ) : (
                        <div className={componentStyles.bodyBlock}>
                            <div className={componentStyles.innerBlock}>
                                <h1 className={componentStyles.pageTitle}>Archived Clients</h1>
                                <p className={componentStyles.pageDescription}>
                                    View and manage archived client data. Data is automatically deleted 7 years after archival.
                                </p>

                                {error && (
                                    <div className={componentStyles.errorMessage}>{error}</div>
                                )}

                                {success && (
                                    <div className={componentStyles.successMessage}>{success}</div>
                                )}

                                {archivedClients.length === 0 ? (
                                    <div className={componentStyles.emptyState}>
                                        <p>No archived clients found.</p>
                                    </div>
                                ) : (
                                    <div className={componentStyles.tableContainer}>
                                        <table className={componentStyles.dataTable}>
                                            <thead>
                                                <tr>
                                                    <th>Client Name</th>
                                                    <th>DOB</th>
                                                    <th>Group Home</th>
                                                    <th>Archived Date</th>
                                                    <th>Deletion Date</th>
                                                    <th>Days Remaining</th>
                                                    <th>Archived By</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {archivedClients.map((client) => {
                                                    const daysRemaining = calculateDaysUntilDeletion(client.archived_deletion_date);
                                                    return (
                                                        <tr key={client.clientID}>
                                                            <td>{client.fName} {client.lName}</td>
                                                            <td>{client.DOB}</td>
                                                            <td>{client.group_home_name || 'N/A'}</td>
                                                            <td>{client.archived_date}</td>
                                                            <td>{client.archived_deletion_date}</td>
                                                            <td className={getDeletionStatusClass(daysRemaining)}>
                                                                {daysRemaining > 0 ? `${daysRemaining} days` : 'Overdue'}
                                                            </td>
                                                            <td>{client.archived_by}</td>
                                                            <td className={componentStyles.actionButtons}>
                                                                <Button
                                                                    nameOfClass={componentStyles.secondaryButton}
                                                                    placeholder="Unarchive"
                                                                    btnType="button"
                                                                    onClick={() => openConfirmDialog(client, 'unarchive')}
                                                                    disabled={isLoading}
                                                                />
                                                                <Button
                                                                    nameOfClass={componentStyles.dangerButton}
                                                                    placeholder="Delete"
                                                                    btnType="button"
                                                                    onClick={() => openConfirmDialog(client, 'delete')}
                                                                    disabled={isLoading}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {showConfirmDialog && selectedClient && (
                        <div className={componentStyles.modalOverlay}>
                            <div className={componentStyles.modal}>
                                <h2 className={componentStyles.modalTitle}>
                                    {confirmAction === 'unarchive' ? 'Confirm Unarchive' : 'Confirm Deletion'}
                                </h2>
                                <p className={componentStyles.modalDescription}>
                                    {confirmAction === 'unarchive' ? (
                                        <>
                                            Are you sure you want to unarchive <strong>{selectedClient.fName} {selectedClient.lName}</strong>?
                                            <br />
                                            This will restore the client to active status.
                                        </>
                                    ) : (
                                        <>
                                            Are you sure you want to permanently delete <strong>{selectedClient.fName} {selectedClient.lName}</strong>'s data?
                                            <br />
                                            <strong style={{ color: '#dc3545' }}>This action cannot be undone!</strong>
                                        </>
                                    )}
                                </p>
                                <div className={componentStyles.modalActions}>
                                    <Button
                                        nameOfClass={componentStyles.secondaryButton}
                                        placeholder="Cancel"
                                        btnType="button"
                                        onClick={closeConfirmDialog}
                                        disabled={isLoading}
                                    />
                                    <Button
                                        nameOfClass={confirmAction === 'unarchive' ? componentStyles.primaryButton : componentStyles.dangerButton}
                                        placeholder={confirmAction === 'unarchive' ? 'Unarchive' : 'Delete Permanently'}
                                        btnType="button"
                                        onClick={handleConfirm}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default ArchivedClients;
