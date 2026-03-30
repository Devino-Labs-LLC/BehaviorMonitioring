"use client";
import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../../styles/components.module.scss';
import Header from '../../../components/header';
import Loading from '../../../components/loading';
import { GetLoggedInUserStatus, GetLoggedInUser } from '../../../function/VerificationCheck';
import { debounceAsync } from '../../../function/debounce';
import { api } from '../../../lib/Api';
import type { GetSessionNotesResponse, SessionNote } from '../../../dto';
import Button from '../../../components/Button';

const ArchiveDetails: React.FC = () => {
    const navigate = useRouter();
    const userLoggedIn = GetLoggedInUserStatus();
    const loggedInUser = GetLoggedInUser();
    const hasInitialized = useRef(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<React.ReactNode>('');
    const [selectedSessionNoteID, setSelectedSessionNoteID] = useState<string | null>(null);
    const [clientID, setClientID] = useState<string | null>(null);
    const [sessionNotesData, setSessionNotesData] = useState<SessionNote[]>([]);
    const [timerCount, setTimerCount] = useState<number>(0);
    const [clearMessageStatus, setClearMessageStatus] = useState<boolean>(false);

    useEffect(() => {
        // Prevent double execution in React Strict Mode
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const storedSessionNoteID = sessionStorage.getItem('archivedSessionNoteId');
        const storedClientID = sessionStorage.getItem('clientID');

        if (!storedClientID || !storedSessionNoteID) {
            navigate.push('/SessionNotes/Archive');
            return;
        }

        setSelectedSessionNoteID(storedSessionNoteID);
        setClientID(storedClientID);

        // Pass IDs directly to avoid state timing issues
        debounceAsync(() => getArchivedSessionNoteDetails(storedClientID, storedSessionNoteID), 300)();

        // Clean up after API call is initiated
        sessionStorage.removeItem('clientID');
        sessionStorage.removeItem('archivedSessionNoteId');
    }, []);

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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                backButtonFuctionality();
            }
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => globalThis.removeEventListener('keydown', handleKeyDown);
    }, []);

    const backButtonFuctionality = () => {
        navigate.back();
    };

    const getArchivedSessionNoteDetails = async (passedClientID?: string, passedNoteID?: string) => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
            return;
        }

        const clientIdToUse = passedClientID || clientID;
        const noteIdToUse = passedNoteID || selectedSessionNoteID;

        try {
            const response = await api<GetSessionNotesResponse>('post', '/aba/getAArchivedSessionNote', {
                "clientID": clientIdToUse,
                "sessionNoteId": noteIdToUse,
                "employeeUsername": loggedInUser
            });

            if (response.statusCode === 200) {
                return setSessionNotesData(response.sessionNotesData);
            } else {
                throw new Error(response.serverMessage);
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
                <title>Archived Session Note - Detail</title>
            </Head>
            <div className={componentStyles.pageBody}>
                <main>
                    {isLoading ?
                        <Loading />
                        :
                        <div className={componentStyles.bodyBlock}>
                            <h1 className={componentStyles.pageHeader}>Archived Session Note - Detail</h1>
                            <div className={componentStyles.tbHRSButtons}>
                                <Button nameOfClass='tbBackButton' placeholder='Back' btnType='button' isLoading={isLoading} onClick={backButtonFuctionality} />
                            </div>
                            <div className={componentStyles.innerBlock}>
                                <p className={componentStyles.statusMessage}>{statusMessage ? <b>{statusMessage}</b> : null}</p>
                                <div className={componentStyles.detailBlock}>
                                    {sessionNotesData.map((note: SessionNote) => (
                                        <div key={note.sessionNoteDataID}>
                                            <div className={componentStyles.tbHeaderDetails}>
                                                <p><b>Client Name:</b> {note.clientName}</p>
                                                <p><b>Session Date:</b> {note.sessionDate}</p>
                                                <p><b>Session Time:</b> {note.sessionTime}</p>
                                                <p><b>Session Notes:</b></p>
                                            </div>
                                            <div className={componentStyles.detailSection}>
                                                <p>{note.sessionNotes}</p>
                                            </div>
                                            <div className={componentStyles.tbHeaderDetails}>
                                                <p><b>Entered By:</b> {note.entered_by}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    }
                </main>
            </div>
        </>
    );
};

export default ArchiveDetails;
