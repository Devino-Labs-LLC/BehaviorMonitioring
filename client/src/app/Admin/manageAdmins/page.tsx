"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../../styles/components.module.scss';
import Header from '../../../components/header';
import Loading from '../../../components/loading';
import Button from '../../../components/Button';
import Link from '../../../components/Link';
import { GetLoggedInUser } from '../../../function/VerificationCheck';
import { useAuth } from '../../../hooks/useAuth';
import { debounceAsync } from '../../../function/debounce';
import { api } from '../../../lib/Api';
import type { GetAdminsResponse, DeleteAdminResponse, AdminEmployee } from '../../../dto';

const ManageAdmins: React.FC = () => {
    const navigate = useRouter();
    const { isReady, isLoggedIn, isAdmin } = useAuth();
    const loggedInUser = GetLoggedInUser();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [statusMessage, setStatusMessage] = useState<React.ReactNode>('');
    const [admins, setAdmins] = useState<AdminEmployee[]>([]);
    const [timerCount, setTimerCount] = useState<number>(0);
    const [clearMessageStatus, setClearMessageStatus] = useState<boolean>(false);

    useEffect(() => {
        if (!isReady) return;
        if (!isLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
        } else if (!isAdmin) {
            navigate.push('/');
        } else {
            debounceAsync(fetchAdmins, 300)();
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

    const fetchAdmins = async () => {
        setIsLoading(true);
        try {
            const response = await api<GetAdminsResponse>('post', '/admin/getAllAdmins', {
                employeeUsername: loggedInUser
            });
            
            if (response.statusCode === 200) {
                setAdmins(response.admins);
            } else {
                throw new Error(response.serverMessage || 'Failed to fetch admins');
            }
        } catch (error) {
            setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = async (admin: AdminEmployee) => {
        if (!window.confirm(`Are you sure you want to delete admin "${admin.username}"? This action cannot be undone.`)) {
            return;
        }

        setIsLoading(true);
        
        try {
            const response = await api<DeleteAdminResponse>('post', '/admin/deleteAnEmployee', {
                employeeID: admin.adminID,
                employeeUsername: loggedInUser
            });
            
            if (response.statusCode === 201) {
                setStatusMessage(`Admin "${admin.username}" has been deleted successfully.`);
                setTimerCount(3);
                setClearMessageStatus(true);
                await fetchAdmins();
            } else {
                throw new Error(response.serverMessage || 'Failed to delete admin');
            }
        } catch (error) {
            setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (adminID: number) => {
        // Navigate to edit page - to be implemented
        navigate.push(`/Admin/manageAdmins/edit?id=${adminID}`);
    };

    return (
        <>
            <Header />
            <Head>
                <title>Manage Admins - BMetrics</title>
            </Head>
            <div className={componentStyles.pageBody}>
                <main>
                    {isLoading ? (
                        <Loading />
                    ) : (
                        <div className={componentStyles.bodyBlock}>
                            <h1 className={componentStyles.pageHeader}>Manage Admins</h1>
                            <div className={componentStyles.tbHRSButtons}>
                                <Button nameOfClass='tbBackButton' placeholder='Back' btnType='button' isLoading={isLoading} onClick={() => navigate.back()} />
                                <Link href='/Admin/manageAdmins/add' hrefType='link' placeholder='Add Admin' />
                            </div>
                            <div className={componentStyles.innerBlock}>
                                <p className={componentStyles.statusMessage}>{statusMessage ? <b>{statusMessage}</b> : null}</p>
                                
                                {admins.length === 0 ? (
                                    <p>No admins found. Click "Add Admin" to create one.</p>
                                ) : (
                                    <table className={componentStyles.tbHRSTable}>
                                        <thead>
                                            <tr>
                                                <th>Username</th>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Role</th>
                                                <th>Status</th>
                                                <th>Last Login</th>
                                                <th>Edit</th>
                                                <th>Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {admins.map((admin) => (
                                                <tr key={admin.adminID}>
                                                    <td><div>{admin.username}</div></td>
                                                    <td><div>{`${admin.firstName} ${admin.lastName}`}</div></td>
                                                    <td><div>{admin.email}</div></td>
                                                    <td><div>{admin.role}</div></td>
                                                    <td><div>{admin.isActive ? 'Active' : 'Inactive'}</div></td>
                                                    <td><div>{admin.lastLogin || 'Never'}</div></td>
                                                    <td>
                                                        <div>
                                                            <button onClick={() => handleEditClick(admin.adminID)}>✏️</button>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div>
                                                            <button onClick={() => handleDeleteClick(admin)}>🗑️</button>
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

export default ManageAdmins;
