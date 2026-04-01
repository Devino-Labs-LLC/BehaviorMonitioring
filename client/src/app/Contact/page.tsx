"use client";
import React from 'react';
import Head from 'next/head';
import componentStyles from '../../styles/components.module.scss';
import Header from '../../components/header';
import Footer from '../../components/footer';

const Contact: React.FC = () => {
    return (
        <>
            <Header />
            <Head>
                <title>Contact - BMetrics</title>
            </Head>
            <div className={componentStyles.pageBody}>
                <main>
                    Contact
                </main>
            </div>
            <Footer />
        </>
    );
};

export default Contact;
