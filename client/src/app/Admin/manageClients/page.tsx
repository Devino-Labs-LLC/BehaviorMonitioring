"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../../styles/components.module.scss';
import Header from '../../../components/header';
import Loading from '../../../components/loading';
import Button from '../../../components/Button';
import Link from '../../../components/Link';
import EmptyStatePrompt from '../../../components/EmptyStatePrompt';
import { useAuth } from '../../../hooks/useAuth';
import { debounceAsync } from '../../../function/debounce';
import { api } from '../../../lib/Api';
import type { GetAllClientsResponse, DeleteClientResponse, Client, ArchiveClientResponse } from '../../../dto';

const ManageClients: React.FC = () => {
    const navigate = useRouter();
    const { isReady, isLoggedIn, isAdmin, username } = useAuth();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [statusMessage, setStatusMessage] = useState<React.ReactNode>('');
    const [clients, setClients] = useState<Client[]>([]);
    const [timerCount, setTimerCount] = useState<number>(0);
    const [clearMessageStatus, setClearMessageStatus] = useState<boolean>(false);
    const [showNoClientsPrompt, setShowNoClientsPrompt] = useState(false);

    useEffect(() => {
        if (!isReady) return;

        if (!isLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
        } else if (!isAdmin) {
            navigate.push('/');
        } else {
            debounceAsync(fetchClients, 300)();
        }
    }, [isReady, isLoggedIn, isAdmin, navigate]);

    useEffect(() => {
        if (timerCount > 0) {
            const timer = setTimeout(() => setTimerCount(timerCount - 1), 1000);
            return () => clearTimeout(timer);
        }
        if (timerCount === 0 && clearMessageStatus) {
            setClearMessageStatus(false);
            setStatusMessage('');
        }
    }, [timerCount, clearMessageStatus]);

    const fetchClients = async () => {
        setIsLoading(true);
        try {
            const response = await api<GetAllClientsResponse>('post', '/aba/getAllClientInfo', {
                employeeUsername: username
            });
            
            if (response.statusCode === 200) {
                setClients(response.clientData);
                if (response.clientData.length === 0) {
                    setShowNoClientsPrompt(true);
                }
            } else {
                throw new Error(response.serverMessage || 'Failed to fetch clients');
            }
        } catch (error) {
            setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = async (client: Client) => {
        if (!window.confirm(`Are you sure you want to delete client "${client.fName} ${client.lName}"? This action cannot be undone.`)) {
            return;
        }

        setIsLoading(true);
        
        try {
            const response = await api<DeleteClientResponse>('post', '/admin/deleteClient', {
                clientID: client.clientID,
                employeeUsername: username
            });
            
            if (response.statusCode === 200) {
                setStatusMessage(`Client "${client.fName} ${client.lName}" has been deleted successfully.`);
                setTimerCount(3);
                setClearMessageStatus(true);
                await fetchClients();
            } else {
                throw new Error(response.serverMessage || 'Failed to delete client');
            }
        } catch (error) {
            setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (clientID: number) => {
        navigate.push(`/Admin/manageClients/edit?id=${clientID}`);
    };

    const handleArchiveClick = async (client: Client) => {
        if (!window.confirm(`Are you sure you want to archive client "${client.fName} ${client.lName}"? This will mark them as inactive and schedule their data for deletion in 7 years.`)) {
            return;
        }

        setIsLoading(true);
        
        try {
            const response = await api<ArchiveClientResponse>('post', '/admin/archiveClient', {
                clientID: client.clientID,
                employeeUsername: username
            });
            
            if (response.statusCode === 200) {
                setStatusMessage(
                    <>
                        Client "{client.fName} {client.lName}" has been archived successfully.
                        <br />
                        Deletion scheduled for: {response.deletionDate}
                    </>
                );
                setTimerCount(5);
                setClearMessageStatus(true);
                await fetchClients();
            } else {
                throw new Error(response.serverMessage || 'Failed to archive client');
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
                <title>Manage Clients - BMetrics</title>
            </Head>
            <EmptyStatePrompt
                title="No Clients Found"
                message="You don't have any clients yet. Would you like to add a new client to get started?"
                isVisible={showNoClientsPrompt}
                navigationPath="/Admin/manageClients/add"
                navigationLabel="Add New Client"
                onClose={() => setShowNoClientsPrompt(false)}
            />
            <div className={componentStyles.pageBody}>
                <main>
                    {isLoading ? (
                        <Loading />
                    ) : (
                        <div className={componentStyles.bodyBlock}>
                            <h1 className={componentStyles.pageHeader}>Manage Clients</h1>
                            <div className={componentStyles.tbHRSButtons}>
                                <Button nameOfClass='tbBackButton' placeholder='Back' btnType='button' isLoading={isLoading} onClick={() => navigate.back()} />
                                <Link href='/Admin/manageClients/add' hrefType='link' placeholder='Add Client' />
                            </div>
                            <div className={componentStyles.innerBlock}>
                                <p className={componentStyles.statusMessage}>{statusMessage ? <b>{statusMessage}</b> : null}</p>
                                
                                {clients.length === 0 ? (
                                    <p>Click "Add Client" above to create your first client.</p>
                                ) : (
                                    <table className={componentStyles.tbClientTable}>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Client Name</th>
                                                <th>Company</th>
                                                <th>Edit</th>
                                                <th>Archive</th>
                                                <th>Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {clients.map((client) => (
                                                <tr key={client.clientID}>
                                                    <td><div>{client.clientID}</div></td>
                                                    <td><div>{client.fName} {client.lName}</div></td>
                                                    <td><div>{client.companyName}</div></td>
                                                    <td>
                                                        <div>
                                                            <button onClick={() => handleEditClick(client.clientID)}>✏️</button>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div>
                                                            <button 
                                                                onClick={() => handleArchiveClick(client)}
                                                                title="Archive client (7-year retention)"
                                                            >
                                                                📦
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div>
                                                            <button onClick={() => handleDeleteClick(client)}>🗑️</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default ManageClients;
