"use client";
import React, { useState, useEffect, useRef, JSX } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../../styles/components.module.scss';
import Header from '../../../components/header';
import Loading from '../../../components/loading';
import { GetLoggedInUserStatus, GetLoggedInUser } from '../../../function/VerificationCheck';
import { debounceAsync } from '../../../function/debounce';
import { api } from '../../../lib/Api';
import type { 
  BehaviorSkill,
  BehaviorSkillData,
  GetBehaviorResponse,
  GetBehaviorDataResponse,
  DeleteBehaviorResponse
} from '../../../dto';
import Button from '../../../components/Button';
import PopoutPrompt from '../../../components/PopoutPrompt';

const ArchiveDetails: React.FC = () => {
    const navigate = useRouter();
    const userLoggedIn = GetLoggedInUserStatus();
    const loggedInUser = GetLoggedInUser();
    const hasInitialized = useRef(false);
    const [clientID, setClientID] = useState<string | null>(null);
    const [bID, setBID] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<React.ReactNode>('');
    const [behaviorBase, setBehaviorBase] = useState<BehaviorSkill[]>([]);
    const [targetBehaviorData, setTargetBehaviorData] = useState<BehaviorSkillData[]>([]);
    const [isPopoutVisible, setIsPopoutVisible] = useState<boolean>(false);
    const [popupAction, setPopupAction] = useState<string>('');
    const [dataIdToActOn, setDataIdToActOn] = useState<string>('');
    const [timerCount, setTimerCount] = useState<number>(0);
    const [clearMessageStatus, setClearMessageStatus] = useState<boolean>(false);
    const [headers, setHeaders] = useState<JSX.Element[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25; // Number of items per page
    const totalPages = Math.ceil(targetBehaviorData.length / itemsPerPage);
    const paginatedData = targetBehaviorData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        // Prevent double execution in React Strict Mode
        if (hasInitialized.current) return;
        hasInitialized.current = true;
        
        const storedClientID = sessionStorage.getItem('clientID');
        const storedBehaviorID = sessionStorage.getItem('archivedBehaviorID');
        
        if (!storedClientID || !storedBehaviorID) {
            navigate.push('/Behavior');
            return;
        }
        
        setClientID(storedClientID);
        setBID(storedBehaviorID);
        
        // Pass IDs directly to avoid state timing issues
        debounceAsync(() => getClientArchivedBehaviorBaseData(storedClientID, storedBehaviorID), 300)();
        debounceAsync(() => getClientTargetBehaviorData(storedClientID, storedBehaviorID), 300)();
        
        // Clean up after API calls are initiated
        sessionStorage.removeItem('clientID');
        sessionStorage.removeItem('archivedBehaviorID');
    }, []);

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

const getClientArchivedBehaviorBaseData = async (passedClientID?: string, passedBehaviorID?: string) => {
        setIsLoading(true);
        setBehaviorBase([]);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
            return;
        }

        const clientIdToUse = passedClientID || clientID;
        const behaviorIdToUse = passedBehaviorID || bID;

        try {
            const response = await api<GetBehaviorResponse>('POST', '/aba/getAClientArchivedBehavior', {
                "clientID": clientIdToUse,
                "behaviorID": behaviorIdToUse,
                "employeeUsername": loggedInUser
            });

            if (response.statusCode === 200) {
                setBehaviorBase(Array.isArray(response.behaviorSkillData) ? response.behaviorSkillData : [response.behaviorSkillData]);
                const behaviors = Array.isArray(response.behaviorSkillData) ? response.behaviorSkillData : [response.behaviorSkillData];
                generateTargetTableHeaders(behaviors[0].measurement);
            } else {
                throw new Error(response.errorMessage);
            }
        } catch (error) {
            return setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    }

const getClientTargetBehaviorData = async (passedClientID?: string, passedBehaviorID?: string) => {
        setIsLoading(true);
        setTargetBehaviorData([]);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
            return;
        }

        const clientIdToUse = passedClientID || clientID;
        const behaviorIdToUse = passedBehaviorID || bID;

        try {
            const response = await api<GetBehaviorDataResponse>('POST', '/aba/getAArchivedBehaviorData', {
                "clientID": clientIdToUse,
                "behaviorID": behaviorIdToUse,
                "employeeUsername": loggedInUser
            });

            if (response.statusCode === 200) {
                const behaviorSkillData = Array.isArray(response.behaviorSkillData) ? response.behaviorSkillData : [];
                setTargetBehaviorData([...behaviorSkillData].reverse());
            } else {
                throw new Error(response.errorMessage);
            }
        } catch (error) {
            setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    }

    const generateTargetTableHeaders = (measurement: string) => {
        setHeaders([]);
        const headers: JSX.Element[] = [
            <th key="sessionDate">Session Date</th>,
            <th key="sessionTime">Session Time</th>,
            <th key='enteredBy'>Entered By</th>,
            <th key='delete'></th>
        ];
        if (measurement === 'Frequency' || measurement === 'Rate') {
            headers.unshift(<th key="count">Count:</th>);
        }
        if (measurement === 'Duration' || measurement === 'Rate') {
            const durationIndex = measurement === 'Rate' ? 1 : 0;
            headers.splice(durationIndex, 0, <th key="duration">Duration:</th>);
        }
        setHeaders(headers);
    };

    const generateTargetTableData = (measurement: string) => {
        return paginatedData.map((data) => (
            <tr key={String(data.behaviorDataID)}>
                {measurement === 'Frequency' || measurement === 'Rate' ? <td><div>{data.count}</div></td> : null}
                {measurement === 'Duration' || measurement === 'Rate' ? <td><div>{data.duration}</div></td> : null}
                <td><div>{data.sessionDate}</div></td>
                <td><div>{data.sessionTime}</div></td>
                <td><div>{data.entered_by}</div></td>
                <td><div><Button nameOfClass='deleteButton' placeholder='Delete' btnType='button' isLoading={isLoading}  onClick={() => { openPopout('Delete', data.behaviorDataID); }} /></div></td>
            </tr>
        ));
    };

    const openPopout = (action: string, behaviorDataId: string) => {
        setPopupAction(action);
        setDataIdToActOn(behaviorDataId);
        setIsPopoutVisible(true);
    };

    const handleDeleteCancel = () => {
        setIsPopoutVisible(false);
    };

    const handleDelete = async () => {
        setIsPopoutVisible(false);
        if (popupAction === 'Delete') {
            await deleteDataCall(dataIdToActOn);
        }
    };

    const deleteDataCall = async (behaviorDataId: string) => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);        
        }

        try {
            const response = await api<DeleteBehaviorResponse>('post', '/aba/deleteArchivedBehaviorData', { "clientID": behaviorBase[0].clientID, "behaviorId": behaviorBase[0].bsID, behaviorDataId, "employeeUsername": loggedInUser });
            if (response.statusCode === 200) {
                setStatusMessage(`Behavior "${behaviorDataId}" has been deleted successfully.`);
                setClientID(String(behaviorBase[0].clientID));
                setBID(String(behaviorBase[0].bsID));
                await debounceAsync(getClientArchivedBehaviorBaseData, 300)();
                await debounceAsync(getClientTargetBehaviorData, 300)();           
                setTimerCount(3);
                setClearMessageStatus(true);  
            } else {
                throw new Error(`Failed to delete "${behaviorDataId}".`);
            }
        } catch (error) {
            return setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const getPageNumbers = () => {
        const totalNumbers = 5; // Number of page buttons to show
        const totalBlocks = totalNumbers + 2; // Including the ellipses
    
        if (totalPages > totalBlocks) {
            const startPage = Math.max(2, currentPage - 2);
            const endPage = Math.min(totalPages - 1, currentPage + 2);
            const pages = Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
    
            if (currentPage > 3) {
                pages.unshift('...');
            }
    
            if (currentPage < totalPages - 2) {
                pages.push('...');
            }
    
            pages.unshift(1);
            pages.push(totalPages);
    
            return pages;
        }
    
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    };

    // Function to handle page change
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    return (
        <>
            <Header />
            <Head>
                <title>Archived Behavior Details - BMetrics</title>
            </Head>
                <div className={componentStyles.pageBody}>
                    <main>
                        {isLoading ? 
                            <Loading /> 
                            :
                            <div className={componentStyles.bodyBlock}>
                                <h1 className={componentStyles.pageHeader}>Archived Behavior Details</h1>
                                <div className={componentStyles.tbHRSButtons}>
                                    <Button nameOfClass='tbBackButton' placeholder='Back' btnType='button' isLoading={isLoading} onClick={backButtonFuctionality}/>
                                </div>
                                <div className={componentStyles.innerBlock}>
                                    <p className={componentStyles.statusMessage}>{statusMessage ? <b>{statusMessage}</b> : null}</p>
                                    { behaviorBase.length > 0 &&
                                        <div className={componentStyles.tbHeaderDetails}>
                                            <p><b>Client Name</b>: {behaviorBase[0].clientName}</p>
                                            <p><b>Behavior Name</b>: {behaviorBase[0].name} </p>
                                            <p><b>Measurement</b>: {behaviorBase[0].measurement}</p>
                                            <p><b>Definition</b>: {behaviorBase[0].definition} </p>
                                        </div>
                                    }
                                    <table className={componentStyles.tbHRSDetailTable}>
                                        <thead>
                                            <tr>
                                                {headers}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {behaviorBase.length > 0 && generateTargetTableData(String(behaviorBase[0].measurement))}
                                        </tbody>
                                    </table>
                                    <div className={componentStyles.pagination}>
                                        {getPageNumbers().length > 0 && (
                                            <>
                                                <Button nameOfClass='paginationLeftButton' placeholder='&lt;' btnType='button' onClick={() => handlePageChange(currentPage - 1)} disabled = {currentPage <= 1}/>
                                                {getPageNumbers().map((page) => (<button key={String(page)} onClick={() => typeof page === 'number' && handlePageChange(page)} className={`${componentStyles.paginationButton} ${currentPage === page ? componentStyles.active : ''}`} disabled={currentPage === page}> {page} </button>))}
                                                <Button nameOfClass='paginationRightButton' placeholder='&gt;' btnType='button' onClick={() => handlePageChange(currentPage + 1)} disabled = {currentPage >= totalPages}/>
                                            </>
                                        )}
                                    </div>
                                    <PopoutPrompt title={`${popupAction} Behavior Data`} message={`Are you sure you want to ${popupAction.toLowerCase()} the behavior "${dataIdToActOn}"?`} onConfirm={handleDelete} onCancel={() => handleDeleteCancel()} isVisible={isPopoutVisible} behaviorNameSelected={dataIdToActOn} />
                                </div>
                            </div>
                        }
                    </main>
                </div>
        </>
    );
};

export default ArchiveDetails;
