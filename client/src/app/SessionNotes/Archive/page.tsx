"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../../styles/components.module.scss';
import Header from '../../../components/header';
import Loading from '../../../components/loading';
import SelectDropdown from '../../../components/Selectdropdown';
import { GetLoggedInUserStatus, GetLoggedInUser } from '../../../function/VerificationCheck';
import { debounceAsync } from '../../../function/debounce';
import { api } from '../../../lib/Api';
import type { 
  ClientOption,
  GetAllClientsResponse,
  GetSessionNotesResponse,
  DeleteSessionNoteResponse,
  SessionNote
} from '../../../dto';
import Button from '../../../components/Button';
import PopoutPrompt from '../../../components/PopoutPrompt';

const Archive: React.FC = () => {
    const navigate = useRouter();
    const userLoggedIn = GetLoggedInUserStatus();
    const loggedInUser = GetLoggedInUser();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [timerCount, setTimerCount] = useState<number>(0);
    const [clearMessageStatus, setClearMessageStatus] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<React.ReactNode>('');
    const [clientLists, setClientLists] = useState<ClientOption[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [selectedClientID, setSelectedClientID] = useState<number>(0);
    const [archivedSessionNotes, setArchivedSessionNotes] = useState<SessionNote[]>([]);
    const [isPopoutVisible, setIsPopoutVisible] = useState<boolean>(false);
    const [popupAction, setPopupAction] = useState<string>('');
    const [sessionNoteNameToActOn, setSessionNoteNameToActOn] = useState<string>('');
    const [sessionNoteIdToActOn, setSessionNoteIdToActOn] = useState<string>('');

    useEffect(() => {
        debounceAsync(getClientNames, 300)();
    }, [userLoggedIn]);

    useEffect(() => {
        if (selectedClientID > 0) {
            getClientArchivedSessionNotes();
        }
    }, [selectedClientID]);

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

    const getClientNames = async () => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
            return;
        }
        try {
            const data = await api<GetAllClientsResponse>('post', '/aba/getAllClientInfo', { "employeeUsername": loggedInUser });
            if (data.statusCode === 200) {
                setSelectedClient(data.clientData[0].fName + " " + data.clientData[0].lName);
                setSelectedClientID(data.clientData[0].clientID);
                const fetchedOptions = data.clientData.map((clientData: { clientID: number, fName: string, lName: string }) => ({
                    value: clientData.clientID,
                    label: `${clientData.fName} ${clientData.lName}`,
                }));
                setClientLists(fetchedOptions);
            } else {
                throw new Error(data.serverMessage);
            }
        } catch (error) {
            return setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const getClientArchivedSessionNotes = async () => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
            return;
        }

        try {
            const response = await api<GetSessionNotesResponse>('post', '/aba/getArchivedSessionNotes', {
                "clientID": selectedClientID,
                "employeeUsername": loggedInUser
            });

            if (response.statusCode === 200) {
                setArchivedSessionNotes(response.sessionNotesData || []);
            } else {
                throw new Error(response.serverMessage);
            }
        } catch (error) {
            return setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleClientChange = (value: any) => {
        setStatusMessage('');
        setArchivedSessionNotes([]);
        setSelectedClient(value);
        const numericValue = value === '' ? NaN : parseFloat(value);
        setSelectedClientID(numericValue);
    };

    const openSessionNoteDetail = (id: string | number) => {
        sessionStorage.setItem('clientID', String(selectedClientID));
        sessionStorage.setItem('archivedSessionNoteId', String(id));
        navigate.push(`/SessionNotes/Archive_Detail`);
    };

    const openPopout = (action: string, sessionNoteId: string, sessionNoteName: string) => {
        setPopupAction(action);
        setSessionNoteNameToActOn(sessionNoteName);
        setSessionNoteIdToActOn(sessionNoteId);
        setIsPopoutVisible(true);
    };

    const handleReactivationDelete = async () => {
        if (popupAction === 'Reactivate') {
            debounceAsync(() => reactivateSessionNoteCall(sessionNoteIdToActOn, sessionNoteNameToActOn), 300)();
        } else if (popupAction === 'Delete') {
            debounceAsync(() => deleteSessionNoteCall(sessionNoteIdToActOn, sessionNoteNameToActOn), 300)();
        }
        setIsPopoutVisible(false);
    };

    const reactivateSessionNoteCall = async (sessionNoteId: string, sessionNoteName: string) => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
            return;
        }

        try {
            const response = await api<any>('post', '/aba/activateSessionNote', { "clientID": selectedClientID, sessionNoteId, "employeeUsername": loggedInUser });
            if (response.statusCode === 200) {
                setStatusMessage(`Session Note "${sessionNoteName}" has been reactivated successfully.`);
                debounceAsync(getClientArchivedSessionNotes, 300)();
                setTimerCount(3);
                setClearMessageStatus(true);
            } else {
                throw new Error(`Failed to reactivate "${sessionNoteName}".`);
            }
        } catch (error) {
            return setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const deleteSessionNoteCall = async (sessionNoteId: string, sessionNoteName: string) => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
            return;
        }

        try {
            const response = await api<DeleteSessionNoteResponse>('post', '/aba/deleteSessionNote', { "clientID": selectedClientID, sessionNoteId, "employeeUsername": loggedInUser });
            if (response.statusCode === 200) {
                setStatusMessage(`Session Note "${sessionNoteName}" has been deleted successfully.`);
                debounceAsync(getClientArchivedSessionNotes, 300)();
                setTimerCount(3);
                setClearMessageStatus(true);
            } else {
                throw new Error(`Failed to delete "${sessionNoteName}".`);
            }
        } catch (error) {
            return setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const backButtonFuctionality = () => {
        navigate.back();
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                backButtonFuctionality();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            <Header />
            <Head>
                <title>Archived Session Notes - BMetrics</title>
            </Head>
            <div className={componentStyles.pageBody}>
                <main>
                    {isLoading ? <Loading /> :
                        <div className={componentStyles.bodyBlock}>
                            <h1 className={componentStyles.pageHeader}>Archived Session Notes</h1>
                            <div className={componentStyles.tbHRSButtons}>
                                <Button nameOfClass='tbGraphButton' placeholder='Back' btnType='button' isLoading={isLoading} onClick={backButtonFuctionality} />
                            </div>
                            <p className={componentStyles.statusMessage}>{statusMessage ? <b>{statusMessage}</b> : null}</p>
                            <div className={componentStyles.innerBlock}>
                                <div className={componentStyles.tbHRSTopBar}>
                                    <label className={componentStyles.clientNameDropdown}>
                                        Archived Session Notes for
                                        <SelectDropdown name={`ClientName`} requiring={true} value={selectedClient} options={clientLists} onChange={(e) => handleClientChange(e.target.value)} />
                                    </label>
                                </div>
                                <table className={componentStyles.archiveTable}>
                                    <thead>
                                        <tr>
                                            <th>Session Date</th>
                                            <th>Session Time</th>
                                            <th>Session Notes</th>
                                            <th>Entered By</th>
                                            <th>Reactivate</th>
                                            <th>Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {archivedSessionNotes.map((note, index) => (
                                            <tr key={index}>
                                                <td onClick={() => openSessionNoteDetail(note.sessionNoteDataID)}><div>{note.sessionDate}</div></td>
                                                <td onClick={() => openSessionNoteDetail(note.sessionNoteDataID)}><div>{note.sessionTime}</div></td>
                                                <td onClick={() => openSessionNoteDetail(note.sessionNoteDataID)}><div>{note.sessionNotes?.substring(0, 50)}{note.sessionNotes && note.sessionNotes.length > 50 ? '...' : ''}</div></td>
                                                <td onClick={() => openSessionNoteDetail(note.sessionNoteDataID)}><div>{note.entered_by}</div></td>
                                                <td><div><Button nameOfClass='tbHRSButton' placeholder='Reactivate' btnType='button' isLoading={isLoading} onClick={(e) => { e.stopPropagation(); openPopout('Reactivate', String(note.sessionNoteDataID), `${note.sessionDate} - ${note.sessionTime}`); }} /></div></td>
                                                <td><div><Button nameOfClass='tbHRSButton' placeholder='Delete' btnType='button' isLoading={isLoading} onClick={(e) => { e.stopPropagation(); openPopout('Delete', String(note.sessionNoteDataID), `${note.sessionDate} - ${note.sessionTime}`); }} /></div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <PopoutPrompt title={`${popupAction} Session Note`} message={`Are you sure you want to ${popupAction.toLowerCase()} the session note "${sessionNoteNameToActOn}"?`} onConfirm={handleReactivationDelete} onCancel={() => setIsPopoutVisible(false)} isVisible={isPopoutVisible} behaviorNameSelected={sessionNoteNameToActOn} />
                            </div>
                        </div>
                    }
                </main>
            </div>
        </>
    );
}

export default Archive;
