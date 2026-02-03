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
  BehaviorSkillOption,
  GetAllClientsResponse,
  GetBehaviorResponse,
  ActivateBehaviorResponse,
  DeleteBehaviorResponse
} from '../../../dto';
import Button from '../../../components/Button';
import PopoutPrompt from '../../../components/PopoutPrompt';
import EmptyStatePrompt from '../../../components/EmptyStatePrompt';


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
    const [archivedBehaviors, setArchivedBehaviors] = useState<BehaviorSkillOption[]>([]);
    const [activeMenu, setActiveMenu] = useState<number | null>(null);
    const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false);
    const [isPopoutVisible, setIsPopoutVisible] = useState<boolean>(false);
    const [mergeBehaviorList, setMergeBehaviorList] = useState<{ id: string; name: string }[]>([]);
    const [popupAction, setPopupAction] = useState<string>('');
    const [behaviorNameToActOn, setBehaviorNameToActOn] = useState<string>('');
    const [behaviorIdToActOn, setBehaviorIdToActOn] = useState<string>('');
    const [showNoClientsPrompt, setShowNoClientsPrompt] = useState(false);

    useEffect(() => {
        debounceAsync(getClientNames, 300)();
    }, [userLoggedIn]);

        useEffect(() => {
            if (selectedClientID > 0) {
                getClientArchivedBehaviors();
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
    }, [timerCount, clearMessageStatus]);;

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
                    value: clientData.clientID,
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

    const getClientArchivedBehaviors = async () => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);        
        }

        try {
            const response = await api<GetBehaviorResponse>('post', '/aba/getClientArchivedBehavior', {
                "clientID": selectedClientID,
                "employeeUsername": loggedInUser
            });

            if (response.statusCode === 200) {
                setArchivedBehaviors([]);

                const fetchedOptions = response.behaviorSkillData.map((behavior) => ({
                    value: behavior.bsID,
                    label: behavior.name,
                    definition: behavior.definition,
                    dateCreated: behavior.date_entered,
                    measurementType: behavior.measurement,
                    behaviorCategory: behavior.category,
                }));

                setArchivedBehaviors(fetchedOptions);
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
        setArchivedBehaviors([]);
        setSelectedClient(value);
        const numericValue = value === '' ? NaN : parseFloat(value);
        setSelectedClientID(numericValue);
    };

    const openBehaviorDetail = (id: string | number) => {
        sessionStorage.setItem('clientID', String(selectedClientID));
        sessionStorage.setItem('archivedBehaviorID', String(id));
        navigate.push(`/Behavior/Archive_Detail`);
    }
    
    const openPopout = (action: string, behaviorId: string, behaviorName: string) => {
        setPopupAction(action);
        setBehaviorNameToActOn(behaviorName);
        setBehaviorIdToActOn(behaviorId);
        setIsPopoutVisible(true);
    };

    const handleReactivationDelete = async () => {
        if (popupAction === 'Reactivate') {
            debounceAsync(() => reactivateBehaviorCall(behaviorIdToActOn, behaviorNameToActOn), 300);
        } else if (popupAction === 'Delete') {
            debounceAsync(() => deleteBehaviorCall(behaviorIdToActOn, behaviorNameToActOn), 300 );
        }
        setIsPopoutVisible(false); // Close the popout after action
    };

    const reactivateBehaviorCall = async (behaviorId: string, behaviorName: string) => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);        
        }

        try {
            const response = await api<ActivateBehaviorResponse>('post', 'aba/activateBehavior', {  "clientID": selectedClientID, behaviorId, "employeeUsername": loggedInUser });
            if (response.statusCode === 200) {
                setStatusMessage(`Behavior "${behaviorName}" has been reactived successfully.`);
                debounceAsync(getClientArchivedBehaviors, 300)();
                setTimerCount(3);
                setClearMessageStatus(true);                                   
            } else {
                throw new Error(`Failed to archive "${behaviorName}".`);
            }
        } catch (error) {
            return setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const deleteBehaviorCall = async (behaviorId: string, behaviorName: string) => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);        
        }

        try {
            const response = await api<DeleteBehaviorResponse>('post', '/aba/deleteBehavior', { "clientID": selectedClientID, behaviorId, "employeeUsername": loggedInUser });
            if (response.statusCode === 200) {
                setStatusMessage(`Behavior "${behaviorName}" has been deleted successfully.`);
                debounceAsync(getClientArchivedBehaviors, 300)();
                setTimerCount(3);
                setClearMessageStatus(true);                                   
            } else {
                throw new Error(`Failed to delete "${behaviorName}".`);
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
            <title>Archived Behavior - BMetrics</title>
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
                {isLoading ? <Loading /> : 
                    <div className={componentStyles.bodyBlock}>
                        <h1 className={componentStyles.pageHeader}>Archived Behavior</h1>
                        <div className={componentStyles.tbHRSButtons}>
                            <Button nameOfClass='tbGraphButton' placeholder='Back' btnType='button' isLoading={isLoading} onClick={backButtonFuctionality}/>
                        </div>
                        <p className={componentStyles.statusMessage}>{statusMessage ? <b>{statusMessage}</b> : null}</p>
                            <div className={componentStyles.innerBlock}>
                                <div className={componentStyles.tbHRSTopBar}>
                                    <label className={componentStyles.clientNameDropdown}>
                                        Archived Behavior for
                                        <SelectDropdown name={`ClientName`} requiring={true} value={selectedClient} options={clientLists} onChange={(e) => handleClientChange(e.target.value)} />
                                    </label>
                                </div>
                                <table className={componentStyles.archiveTable}>
                                    <thead>
                                        <tr>
                                            <th>Behavior Name</th>
                                            <th>Definition</th>
                                            <th>Measurement</th>
                                            <th>Reactivate</th>
                                            <th>Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {archivedBehaviors.map((option, index) => (
                                            <tr key={index}>
                                                <td onClick={() => openBehaviorDetail(option.value)}><div>{option.label}</div></td>
                                                <td onClick={() => openBehaviorDetail(option.value)}><div>{option.definition}</div></td>
                                                <td onClick={() => openBehaviorDetail(option.value)}><div>{option.measurementType}</div></td>
                                                <td><div><Button nameOfClass='tbHRSButton' placeholder='Reactivate' btnType='button' isLoading={isLoading} onClick={(e) => {e.stopPropagation(); const selectedBehavior = archivedBehaviors[index]; openPopout('Reactivate', String(selectedBehavior.value), selectedBehavior.label);}}/></div></td>
                                                <td><div><Button nameOfClass='tbHRSButton' placeholder='Delete' btnType='button' isLoading={isLoading} onClick={(e) => {e.stopPropagation(); const selectedBehavior = archivedBehaviors[index]; openPopout('Delete', String(selectedBehavior.value), selectedBehavior.label);}}/></div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <PopoutPrompt title={`${popupAction} Behavior`} message={`Are you sure you want to ${popupAction.toLowerCase()} the behavior "${behaviorNameToActOn}"?`} onConfirm={handleReactivationDelete} onCancel={() => setIsPopoutVisible(false)} isVisible={isPopoutVisible} behaviorNameSelected={behaviorNameToActOn} />
                            </div>
                    </div>
                }
            </main>
        </div>
        </>
    );
}

export default Archive;
