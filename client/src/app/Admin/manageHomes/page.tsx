"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../../styles/components.module.scss';
import Header from '../../../components/header';
import Loading from '../../../components/loading';
import Button from '../../../components/Button';
import { useAuth } from '../../../hooks/useAuth';
import { debounceAsync } from '../../../function/debounce';
import { api } from '../../../lib/Api';
import type { GetHomesResponse, DeleteHomeResponse } from '../../../dto';

const ManageHomes: React.FC = () => {
    const navigate = useRouter();
    const { isReady, isLoggedIn, isAdmin, username } = useAuth();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [homes, setHomes] = useState<any[]>([]);
    const [statusMessage, setStatusMessage] = useState<string>('');

    useEffect(() => {
        if (!isReady) return;

        if (!isLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
        } else if (!isAdmin) {
            navigate.push('/');
        } else {
            fetchHomes();
        }
    }, [isReady, isLoggedIn, isAdmin, navigate]);

    const fetchHomes = async () => {
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
                setHomes(response.homes || []);
            } else {
                throw new Error((response as any).serverMessage || 'Failed to fetch homes');
            }
        } catch (error) {
            setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = async (homeID: number, homeName: string) => {
        if (!globalThis.confirm(`Are you sure you want to delete home "${homeName}"? This action cannot be undone.`)) {
            return;
        }

        setIsLoading(true);

        try {
            if (!username) {
                setStatusMessage('Unable to identify the current user. Please log in again.');
                setTimeout(() => setStatusMessage(''), 3000);
                return;
            }

            const response = await api<DeleteHomeResponse>('post', '/admin/deleteHome', {
                homeID,
                employeeUsername: username
            });
            if ((response as any).statusCode === 200) {
                setStatusMessage('Home deleted successfully');
                setTimeout(() => setStatusMessage(''), 3000);
                await fetchHomes();
            } else {
                throw new Error((response as any).serverMessage || 'Failed to delete home');
            }
        } catch (error) {
            setStatusMessage(String(error));
            setTimeout(() => setStatusMessage(''), 3000);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (homeID: number) => {
        navigate.push(`/Admin/manageHomes/edit?homeID=${homeID}`);
    };

    return (
        <>
            <Header />
            <Head>
                <title>Manage Homes - BMetrics</title>
            </Head>
            <div className={componentStyles.pageBody}>
                <main>
                    {isLoading ? (
                        <Loading />
                    ) : (
                        <div className={componentStyles.bodyBlock}>
                            <h1 className={componentStyles.pageHeader}>Manage Homes</h1>
                            <div className={componentStyles.tbHRSButtons}>
                                <Button nameOfClass='tbBackButton' placeholder='Back' btnType='button' isLoading={isLoading} onClick={() => navigate.back()} />
                                <Button nameOfClass='tbAddButton' placeholder='Add Home' btnType='button' isLoading={isLoading} onClick={() => navigate.push('/Admin/manageHomes/add')} />
                            </div>
                            
                            {statusMessage && <p className={componentStyles.statusMessage}>{statusMessage}</p>}
                            
                            <div className={componentStyles.innerBlock}>
                                <table className={componentStyles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th>Home ID</th>
                                            <th>Home Name</th>
                                            <th>Address</th>
                                            <th>City</th>
                                            <th>State</th>
                                            <th>Capacity</th>
                                            <th>Current Occupancy</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {homes.length > 0 ? (
                                            homes.map((home) => (
                                                <tr key={home.homeID}>
                                                    <td>{home.homeID}</td>
                                                    <td>{home.homeName}</td>
                                                    <td>{home.address}</td>
                                                    <td>{home.city}</td>
                                                    <td>{home.state}</td>
                                                    <td>{home.capacity}</td>
                                                    <td>{home.currentOccupancy}</td>
                                                    <td>
                                                        <Button 
                                                            nameOfClass='editButton' 
                                                            placeholder='Edit' 
                                                            btnType='button' 
                                                            isLoading={false}
                                                            onClick={() => handleEditClick(home.homeID)}
                                                        />
                                                        <Button 
                                                            nameOfClass='deleteButton' 
                                                            placeholder='Delete' 
                                                            btnType='button' 
                                                            isLoading={false}
                                                            onClick={() => handleDeleteClick(home.homeID, home.homeName)}
                                                        />
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={8} style={{ textAlign: 'center' }}>No homes found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default ManageHomes;
