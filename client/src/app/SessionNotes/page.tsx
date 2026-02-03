"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../styles/components.module.scss';
import Header from '../../components/header';
import Loading from '../../components/loading';
import SelectDropdown from '../../components/Selectdropdown';
import Checkbox from '../../components/Checkbox';
import Link from '../../components/Link';
import { GetLoggedInUserStatus, GetLoggedInUser } from '../../function/VerificationCheck';
import { debounceAsync } from '../../function/debounce';
import { api } from '../../lib/Api';
import type { GetAllClientsResponse, GetSessionNotesResponse, DeleteSessionNoteResponse, SessionNote } from '../../dto';
import Button from '../../components/Button';
import PopoutPrompt from '../../components/PopoutPrompt';
import EmptyStatePrompt from '../../components/EmptyStatePrompt';

const SessionNotes: React.FC = () => {
    const navigate = useRouter();
    const userLoggedIn = GetLoggedInUserStatus();
    const loggedInUser = GetLoggedInUser();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<React.ReactNode>('');
    const [clientLists, setClientLists] = useState<{ value: string; label: string }[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [selectedClientID, setSelectedClientID] = useState<number>(0);
    const [notesOptions, setNotesOptions] = useState<SessionNote[]>([]);
    const [checkedNotes, setCheckedNotes] = useState<{ id: string; name: string; }[]>([]);
    const [checkedState, setCheckedState] = useState<boolean[]>([]); // Track checked state
    const maxCheckedLimit = 4; // Define a limit for checkboxes
    const [activeMenu, setActiveMenu] = useState<number | null>(null);
    const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false);
    const [isPopoutVisible, setIsPopoutVisible] = useState<boolean>(false);
    const [mergeBehaviorList, setMergeBehaviorList] = useState<{ id: string; name: string }[]>([]);
    const [popupAction, setPopupAction] = useState<string>('');
    const [sessionNotesToActOn, setSessionNotesToActOn] = useState<string>('');
    const [sessionNotesIdToActOn, setSessionNotesIdToActOn] = useState<string>('');
    const [timerCount, setTimerCount] = useState<number>(0);
    const [clearMessageStatus, setClearMessageStatus] = useState<boolean>(false);
    const [showNoClientsPrompt, setShowNoClientsPrompt] = useState(false);

    useEffect(() => {
        debounceAsync(getClientNames, 300)();
    }, [userLoggedIn]);

    useEffect(() => {
        if (selectedClientID > 0) {
            debounceAsync(getClientSessionNotes, 300)();
        }
    }, [selectedClientID]);
    
    useEffect(() => {
        if (timerCount > 0) {
            const timer = setTimeout(() => setTimerCount(timerCount - 1), 1000);
            return () => clearTimeout(timer);
        }
        if (timerCount === 0 && clearMessageStatus) {
            setClearMessageStatus(false);
            setStatusMessage('')
        }
    }, [timerCount, clearMessageStatus]);

    const getClientNames = async () => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
        }
        try {
            const data = await api<GetAllClientsResponse>('post','/aba/getAllClientInfo', { "employeeUsername": loggedInUser });
            if (data.statusCode === 200) {
                if (data.clientData.length === 0) {
                    setShowNoClientsPrompt(true);
                    return;
                }
                setSelectedClient(data.clientData[0].fName + " " + data.clientData[0].lName);
                setSelectedClientID(data.clientData[0].clientID);
                const fetchedOptions = data.clientData.map((clientData: { clientID: number, fName: string, lName: string }) => ({
                    value: String(clientData.clientID),
                    label: `${clientData.fName} ${clientData.lName}`,
                }));
                setClientLists(fetchedOptions);
            } else if (data.statusCode === 401) {
                const previousUrl = encodeURIComponent(location.pathname);
                navigate.push(`/Login?previousUrl=${previousUrl}`);
                return;
            } else {
                throw new Error(data.serverMessage);
            }
        } catch (error: any) {
            if (error?.response?.status === 401 || error?.response?.data?.serverMessage === 'Unauthorized user') {
                const previousUrl = encodeURIComponent(location.pathname);
                navigate.push(`/Login?previousUrl=${previousUrl}`);
                return;
            }
            return setStatusMessage(error?.response?.data?.serverMessage || String(error));
        }
        finally {
            setIsLoading(false);
        }
    };

    const getClientSessionNotes = async () => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);        
        }

        try {
            const response = await api<GetSessionNotesResponse>('post', '/aba/getSessionNotes', {
                "clientID": selectedClientID,
                "employeeUsername": loggedInUser
            });

            if (response.statusCode === 200) {
                const labelLength = 50;
                setNotesOptions([]);
                setCheckedState([]);
                setCheckedNotes([]);
                sessionStorage.removeItem('checkedNotes');

                const fetchedOptions = response.sessionNotesData.map((notes) => ({
                    ...notes,
                    value: notes.sessionNoteDataID,
                    label: notes.sessionNotes.length > labelLength ? notes.sessionNotes.substring(0, labelLength) + '...' : notes.sessionNotes,
                    entered_by: notes.entered_by,
                }));
                setNotesOptions(fetchedOptions);
                setCheckedState(new Array(fetchedOptions.length).fill(false));
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
        setNotesOptions([]);
        setSelectedClient(value.name);
        const numericValue = value.id === '' ? NaN : parseFloat(value.id);
        setSelectedClientID(numericValue);
        setCheckedState(new Array(notesOptions.length).fill(false)); // Reset checkboxes
    };

    const handleCheckBoxChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const updatedCheckedState = [...checkedState];
        const selectedNotes = notesOptions[index];
        
        if (e.target.checked) {
            const currentCheckedCount = updatedCheckedState.filter(Boolean).length;
        
            if (currentCheckedCount < maxCheckedLimit) {
                updatedCheckedState[index] = true;
                setCheckedState(updatedCheckedState);
                
                // Add clientName and measurementType to the checked behavior data
                setCheckedNotes(prev => {
                    const newCheckedBehaviors = [
                        ...prev, 
                        {
                            id: String(selectedNotes.value || ''),
                            name: selectedNotes.label || '',
                            clientName: selectedClient,  // Add clientName
                        }
                    ];
                    sessionStorage.setItem('checkedNotes', JSON.stringify(newCheckedBehaviors));
                    return newCheckedBehaviors;
                });
            }
        } else {
            updatedCheckedState[index] = false;
            setCheckedState(updatedCheckedState);
            setCheckedNotes(prev => {
                const newCheckedBehaviors = prev.filter(behavior => behavior.id !== String(selectedNotes.value));
                sessionStorage.setItem('checkedNotes', JSON.stringify(newCheckedBehaviors));
                return newCheckedBehaviors;
            });
        }
    };
        
    const isCheckboxDisabled = (index: number) => {
        const currentCheckedCount = checkedState.filter(Boolean).length;
    
        return (
            (!checkedState[index] && currentCheckedCount >= maxCheckedLimit)
        );
    };

    const handleEllipsisClick = (index: number) => {
        if (activeMenu === index) {
            closeMenu(); // Close if clicked again
        } else {
            setActiveMenu(index); // Open for the clicked row
        }
    };
    
    const getMenuPosition = (menuIndex: number) => {
        const ellipsisButton = document.querySelectorAll('.tbHRSEllipsesButton')[menuIndex];
        if (ellipsisButton) {
            const buttonRect = ellipsisButton.getBoundingClientRect();
            const menuTop = buttonRect.top + window.scrollY; // Account for scrolling
            const menuLeft = buttonRect.left + window.scrollX + buttonRect.width; // Offset for width
            return {
                top: `${menuTop}px`,
                left: `${menuLeft}px`,
            };
        }
        return { top: '0px', left: '0px' };
    };
            
    const closeMenu = () => setActiveMenu(null); // Close the menu

    const openPopout = (action: string, sessionId: string, sessionNote: string) => {
        setPopupAction(action);
        setSessionNotesToActOn(sessionId);
        setSessionNotesIdToActOn(sessionNote);
        setIsPopoutVisible(true);
    };

    const openNotesDetail = (id: string | number) => {
        sessionStorage.setItem('clientID', String(selectedClientID));
        sessionStorage.setItem('sessionNoteId', String(id));
        navigate.push(`/SessionNotes/Detail`);
    }

    const handleDelete = async () => {
        setIsPopoutVisible(false);
        await debounceAsync(() => deleteSessionNoteCall(sessionNotesIdToActOn, sessionNotesToActOn), 300)();
    };

    const deleteSessionNoteCall = async (sessionNoteId: string, sessionNoteName: string) => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);        
        }
        
        try {
            const response = await api<DeleteSessionNoteResponse>('post', '/aba/deleteSessionNote', {
                "clientID": selectedClientID, 
                "sessionNoteId": sessionNoteId, 
                "employeeUsername": loggedInUser 
            });

            if (response.statusCode === 200) {
                setStatusMessage(`Session Note "${sessionNoteName}" has been deleted successfully.`);
                // Update the notesOptions state to remove the deleted behavior
                setTimerCount(3);
                setClearMessageStatus(true);                                   
        } else {
                throw new Error(`Failed to delete "${sessionNoteName}".`);
            }
        } catch (error) {
            return setStatusMessage(String(error));
        }
        finally {
            setIsLoading(false);
        }
    };
    
    return (
        <>
            <Header />
            <Head>
                <title>Session Notes - BMetrics</title>
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
                    {isLoading ?
                        <Loading />
                        :
                        <div className={componentStyles.bodyBlock}>
                            <div className={componentStyles.tbHRSButtons}>
                                <Link href='/DataEntry' hrefType='link' placeholder="Add Session Notes" />
                                <Link href='/SessionNotes/Archive' hrefType='link' placeholder="Archived Notes" />
                            </div>
                            <p className={componentStyles.statusMessage}>{statusMessage ? <b>{statusMessage}</b> : null}</p>
                            <div className={componentStyles.innerBlock}>
                                <div className={componentStyles.tbHRSTopBar}>
                                    <label className={componentStyles.clientNameDropdown}>
                                        Current Behavior for
                                        <SelectDropdown name={`ClientName`} requiring={true} value={selectedClientID} options={clientLists} onChange={(e) => handleClientChange({ name: e.target.options[e.target.selectedIndex].text || '', id: e.target.value})} />
                                    </label>
                                </div>
                                <table className={componentStyles.sessionNoteTable}>
                                    <thead>
                                        <tr>
                                            <th></th>
                                            <th>Session Date</th>
                                            <th>Session Notes</th>
                                            <th>Entered By</th>
                                            <th>More Options</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {notesOptions.map((option, index) => (
                                            <tr key={index}>
                                                <td><div><Checkbox nameOfClass='tbGraphTable' label={option.label || ''} isChecked={checkedState[index]} onChange={handleCheckBoxChange(index)} disabled={isCheckboxDisabled(index)}/></div></td>
                                                <td onClick={() => openNotesDetail(option.value || '')}><div>{option.sessionDate}</div></td>
                                                <td onClick={() => openNotesDetail(option.value || '')}><div>{option.label}</div></td>
                                                <td onClick={() => openNotesDetail(option.value || '')}><div>{option.entered_by}</div></td>
                                                <td><div><Button nameOfClass='tbHRSEllipsesButton' btnName='More options' placeholder='...' btnType='button' isLoading={isLoading} onClick={(e) => {e.stopPropagation(); handleEllipsisClick(index)}}/></div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {activeMenu !== null && (
                                    <div className={componentStyles.popoutMenu} style={getMenuPosition(activeMenu)}>
                                        <ul>
                                            <li onClick={() => { const selectedNotes = notesOptions[activeMenu]; closeMenu(); openPopout('Delete', String(selectedNotes.value || ''), selectedNotes.label || ''); }}>Delete</li>
                                            <li onClick={closeMenu}>Close Menu</li>
                                        </ul>
                                    </div>
                                )}
                                <PopoutPrompt title={`${popupAction} Behavior`} message={`Are you sure you want to ${popupAction.toLowerCase()} the behavior "${sessionNotesToActOn}"?`} onConfirm={debounceAsync(handleDelete, 300)} onCancel={() => setIsPopoutVisible(false)} isVisible={isPopoutVisible} behaviorNameSelected={sessionNotesToActOn} />
                            </div>
                        </div>
                    }
                </main>
            </div>
        </>
    );
}

export default SessionNotes;