"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../../styles/components.module.scss';
import Header from '../../../components/header';
import Loading from '../../../components/loading';
import { GetLoggedInUserStatus, GetLoggedInUser } from '../../../function/VerificationCheck';
import { debounceAsync } from '../../../function/debounce';
import { api } from '../../../lib/Api';
import type { SelectedBehaviorSkill, GetBehaviorDataResponse } from '../../../dto';
import { DATE_RANGES } from '../../../dto';
import SelectDropdown from '../../../components/Selectdropdown';
import GraphDataProcessor from '../../../function/GraphDataProcessor';
import Button from '../../../components/Button';

const Graph: React.FC = () => {
    const navigate = useRouter();
    const userLoggedIn = GetLoggedInUserStatus();
    const loggedInUser = GetLoggedInUser();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<React.ReactNode>('');
    const [clientName, setClientName] = useState<string>('');
    const [measurementType, setMeasurementType] = useState<string>('');
    const [clientID, setClientID] = useState<string | null>(null);
    const [selectedData, setSelectedData] = useState<SelectedBehaviorSkill[]>([]);
    const [fetchedData, setFetchedData] = useState<any[]>([]);
    const [behaviorNames, setBehaviorNames] = useState<Record<string, string>>({}); // New state for behavior names
    const [dateRangeLabel, setDateRangeLabel] = useState<string>(DATE_RANGES[0].label); // Default to 7 days
    const [dateRange, setDateRange] = useState<number>(7); // Default to 7 days
    const dateRanges = DATE_RANGES.map(option => ({ value: Number(option.value), label: option.label }));

    useEffect(() => {
        checkSelectedId();
    }, [userLoggedIn]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                backButtonFuctionality();
            }
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => globalThis.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleDateRangeChange = (range: number) => {
        const selectedRange = dateRanges.find(r => r.value === range);
        setDateRange(range);
        setDateRangeLabel(selectedRange?.label || "Last 7 Days");
    };

    const checkSelectedId = () => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);        
        }
        
        try {
            const checkedBehaviors = sessionStorage.getItem('checkedBehaviors');
            const storedClientID = sessionStorage.getItem('clientID');
            setClientID(storedClientID);
            
            const selectedIDs: SelectedBehaviorSkill[] = JSON.parse(checkedBehaviors || '[]');
            setSelectedData(selectedIDs);
            
            // Set client name and measurement type from selected data
            if (selectedIDs.length > 0) {
                setClientName(selectedIDs[0].clientName || '');
                setMeasurementType(selectedIDs[0].measurementType || '');
            }
            
            // Create a mapping of behavior names based on selected IDs
            const namesMap: Record<string, string> = {};
            selectedIDs.forEach((item: SelectedBehaviorSkill) => {
                namesMap[item.id] = item.name;
            });
            return setBehaviorNames(namesMap); // Update the state with the behavior names
        } catch {
            setStatusMessage("Selected IDs are not found");
        }
        finally {
            setIsLoading(false);
        }
    }

    const getTargetData = async (bID: number) => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);        
        }

        try {
            const response = await api<GetBehaviorDataResponse>('post', '/aba/getTargetBehavior', {
                "clientID": clientID,
                "behaviorID": bID,
                "employeeUsername": loggedInUser
            });
            if (response.statusCode === 200) {
                return response.behaviorSkillData;
            } else {
                throw new Error(response.serverMessage);
            }
        } catch (error) {
            setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    // New helper function to filter data based on date range
    const filterDataByDateRange = (data: any[]) => {
        const now = new Date();
        const filtered = data.filter((entry: any) => {
            if (!entry?.sessionDate) return false; // Ensure valid data
            const entryDate = new Date(entry.sessionDate);
            const daysDifference = (now.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
            return daysDifference <= dateRange;
        });
        return filtered.length > 0 ? filtered : [{ sessionDate: new Date().toISOString(), count: 0 }]; // Ensure no ghost data
    };

    useEffect(() => {
        setStatusMessage(null);
        setFetchedData([]); // Clear the previous graph data

        if (selectedData.length > 0) { // Ensure there's data to fetch
            setIsLoading(true);

            Promise.all([...new Set(selectedData.map(item => item.id))].map(id => debounceAsync(() => getTargetData(Number(id)), 300)()))
                .then((allData) => {
                    const flattenedData = allData.flat().filter(entry => entry !== null);
                    const filteredData = filterDataByDateRange(flattenedData); // Filter data based on date range
                    
                    const isEmptyData = filteredData.length === 0 || 
                        (filteredData.length === 1 && filteredData[0]?.count === 0 && !filteredData[0]?.behaviorDataID);

                    if (isEmptyData) {
                        return setStatusMessage("No data available within range");
                    }
    
                    setFetchedData(filteredData);
                    setIsLoading(false);
                })
                .catch(error => {
                    console.error(error);
                    setStatusMessage('Error loading data');
                    setIsLoading(false);
                });
        } else if (!isLoading) {
            setStatusMessage('Unable to locate selected data');
        }
    }, [selectedData, dateRange]); // Add dateRange as a dependency so it triggers re-fetch when the range changes
        
    const backButtonFuctionality = () => {
        navigate.back();
    };

    return (
        <>
            <Header />
            <Head>
                <title>Graph - BMetrics</title>
            </Head>
            <div className={componentStyles.pageBody}>
                <main>
                    {isLoading ? 
                        <Loading/> 
                        :
                        <div className={componentStyles.bodyBlock}>
                            <h1 className={componentStyles.pageHeader}>Behavior Graph</h1>
                            <div className={componentStyles.innerBlock}>
                                <p className={componentStyles.statusMessage}>{statusMessage ? <b>{statusMessage}</b> : null}</p>
                                <label className={componentStyles.dateDropdown}>
                                    <b>Graph for the</b>
                                    <SelectDropdown name={`DateRange`} requiring={true} value={dateRange} options={dateRanges.map((range) => ({ value: range.value, label: range.label }))} onChange={(e) => handleDateRangeChange(Number(e.target.value))} />
                                </label>
                                <div className={componentStyles.tbGraphShell}><GraphDataProcessor fetchedData={fetchedData} behaviorNames={behaviorNames} title={`${clientName}'s Behavior(s) Over the ${dateRangeLabel}`} measurementType={measurementType} dateRange={dateRange}/></div>
                                <Button nameOfClass='tbGraphButton' placeholder='Back' btnType='button' isLoading={isLoading} onClick={backButtonFuctionality}/>
                            </div>
                        </div>
                    }
                </main>
            </div>
        </>
    );
}

export default Graph;
