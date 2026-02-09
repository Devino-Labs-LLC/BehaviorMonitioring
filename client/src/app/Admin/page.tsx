"use client";
import React, {useState, useEffect} from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../styles/components.module.scss';
import Header from '../../components/header';
import Link from '../../components/Link';
import Loading from '../../components/loading';
import { useAuth } from '../../hooks/useAuth';

const Admin: React.FC = () => {
    const navigate = useRouter();
    const { isReady, isLoggedIn, isAdmin } = useAuth();
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!isReady) return;

        if (!isLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);        
        }
        else if (!isAdmin) {
            navigate.push('/');        
        }
        setIsLoading(false);
    }, [isReady, isLoggedIn, isAdmin, navigate]);

    return (
        <>
        <Header/>
        <Head>
            <title>Admin - BMetrics</title>
        </Head>
        <div className={componentStyles.pageBody}>
            <main>
                {isLoading ? 
                    <Loading/> 
                    :
                    <div className={componentStyles.bodyBlock}>
                        <div className={componentStyles.innerBlock}>
                            <div className={componentStyles.adminLinksContainer}>
                                <Link href='/Admin/manageAdmins' hrefType='link' placeholder="Manage admins" />
                                <Link href='/Admin/manageClients' hrefType='link' placeholder="Manage clients" />
                                <Link href='/Admin/manageHomes' hrefType='link' placeholder="Manage homes" />
                                <Link href='/Admin/ArchivedClients' hrefType='link' placeholder="Archived clients" />
                            </div>
                        </div>
                    </div>
                }
            </main>
        </div>
        </>
    );
}

export default Admin;