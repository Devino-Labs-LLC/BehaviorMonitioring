"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../../styles/components.module.scss';
import Header from '../../../components/header';
import Loading from '../../../components/loading';
import { GetLoggedInUserStatus } from '../../../function/VerificationCheck';

const AddSkillAquisition: React.FC = () => {
    const navigate = useRouter();
    const userLoggedIn = GetLoggedInUserStatus();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        if (userLoggedIn) {
            setIsLoading(true);
            //Get skill aquisition
            setIsLoading(false);
            return;
        }

        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);        
        }
    }, [userLoggedIn]);

  return (
    <>
        <Header />
        <Head>
            <title>Add Skills - BMetrics</title>
        </Head>
        <div className={componentStyles.pageBody}>
            <main>
                {isLoading ? 
                    <Loading/> 
                    :
                    <div className={componentStyles.saBody}>
                        Skill Aquisition
                    </div>
                }
            </main>
        </div>
    </>
  );
};

export default AddSkillAquisition;
