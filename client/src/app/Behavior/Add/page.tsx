"use client";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import componentStyles from '../../../styles/components.module.scss';
import Header from '../../../components/header';
import Button from '../../../components/Button';
import Loading from '../../../components/loading';
import { GetLoggedInUserStatus, GetLoggedInUser } from '../../../function/VerificationCheck';
import { debounceAsync } from '../../../function/debounce';
import { 
  BEHAVIOR_CATEGORIES, 
  MEASUREMENT_TYPES,
  GetAllClientsResponse,
  ClientOption,
  AddBehaviorResponse,
  AddBehaviorRequest,
  BehaviorToAdd
} from '../../../dto';
import { api } from '../../../lib/Api';
import SelectDropdown from '../../../components/Selectdropdown';
import InputFields from '../../../components/Inputfield';
import TextareaInput from '../../../components/TextareaInput';
import NoClientsPrompt from '../../../components/NoClientsPrompt';

const AddTargetBehavior: React.FC = () => {
    const navigate = useRouter();
    const userLoggedIn = GetLoggedInUserStatus();
    const loggedInUser = GetLoggedInUser();
    const behaviorOrSkill = 'Behavior';
    const behaviorCategories = BEHAVIOR_CATEGORIES.map((category) => ({ value: category, label: category }));
    const behaviorMeasurements = MEASUREMENT_TYPES.map((measurement) => ({ value: measurement, label: measurement }));
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<React.ReactNode>('');
    const [clearMessageStatus, setClearMessageStatus] = useState<boolean>(false);
    const [timerCount, setTimerCount] = useState<number>(0);
    const [clientLists, setClientLists] = useState<ClientOption[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [selectedClientID, setSelectedClientID] = useState<number>(0);
    const [behaviorName, setBehaviorName] = useState<string>('');
    const [behaviorCategorySelected, setBehaviorCategorySelected] = useState<string>('');
    const [otherBehaviorCategories, setOtherBehaviorCategory] = useState<string>('');
    const [behaviorDefinition, setBehaviorDefinition] = useState<string>('');
    const [behaviorMeasurementSelected, setBehaviorMeasurementSelected] = useState<string>('');
    const [behaviorsToAdd, setBehaviorsToAdd] = useState<BehaviorToAdd[]>([]);
    const [showNoClientsPrompt, setShowNoClientsPrompt] = useState(false);

    useEffect(() => {
        debounceAsync(getClientNames, 300)();
    }, [userLoggedIn]);

    const getClientNames = async () => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
        }
        try {
            const response = await api<GetAllClientsResponse>('post','/aba/getAllClientInfo', { "employeeUsername": loggedInUser });
            if (response.statusCode === 200) {
                if (response.clientData.length === 0) {
                    setShowNoClientsPrompt(true);
                    return;
                }
                setSelectedClient(response.clientData[0].fName + " " + response.clientData[0].lName);
                setSelectedClientID(response.clientData[0].clientID);
                const fetchedOptions = response.clientData.map((clientData: { clientID: number, fName: string, lName: string }) => ({
                    value: clientData.clientID,
                    label: `${clientData.fName} ${clientData.lName}`,
                }));
                setClientLists(fetchedOptions);
            } else if (response.statusCode === 401) {
                const previousUrl = encodeURIComponent(location.pathname);
                navigate.push(`/Login?previousUrl=${previousUrl}`);
                return;
            } else {
                throw new Error(response.serverMessage);
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

    const handleClientChange = (value: any) => {
        setSelectedClient(value.name);
        const numericValue = value.id === '' ? Number.NaN : Number.parseFloat(value.id);
        setSelectedClientID(numericValue);
    };


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

    const backButtonFuctionality = () => {
        navigate.back();
    };

    const addBehavior = () => {
        if (behaviorName.length < 3 || behaviorCategorySelected === BEHAVIOR_CATEGORIES[0] || behaviorDefinition.length < 3 || behaviorMeasurementSelected === MEASUREMENT_TYPES[0]) {
            setStatusMessage('Please fill out all fields');
        } else {
            const newBehavior: BehaviorToAdd = { 
                clientName: selectedClient, 
                clientID: selectedClientID, 
                behaviorName: behaviorName, 
                behaviorCategory: behaviorCategorySelected === 'Other' ? otherBehaviorCategories : behaviorCategorySelected, 
                behaviorDefinition: behaviorDefinition, 
                behaviorMeasurement: behaviorMeasurementSelected, 
                type: behaviorOrSkill as 'Behavior' | 'Skill'
            };
            setBehaviorsToAdd([...behaviorsToAdd, newBehavior]);
            setBehaviorName('');
            setBehaviorCategorySelected(BEHAVIOR_CATEGORIES[0]);
            if (otherBehaviorCategories.length > 0) {
                setOtherBehaviorCategory('');
            }
            setBehaviorDefinition('');
            setBehaviorMeasurementSelected(MEASUREMENT_TYPES[0]);
        }
    }

    const submitBehavior = async () => {
        setIsLoading(true);
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);

        }
        
        try {
            const response = await api<AddBehaviorResponse>('post', '/aba/addNewTargetBehavior', {
                "employeeUsername": loggedInUser,
                "behaviors": behaviorsToAdd
            } as AddBehaviorRequest);
            if (response.statusCode === 204) {
                setStatusMessage(response.serverMessage);
                setBehaviorsToAdd([]);
                setClearMessageStatus(true);
                setTimerCount(5);
            } else if (response.statusCode === 500 && response.failedBehaviors) {
                setStatusMessage(response.serverMessage);
                setBehaviorsToAdd(response.failedBehaviors);
            } else {
                throw new Error(response.serverMessage)
            }
        } catch (error) {
            return setStatusMessage(String(error));
        } finally {
            setIsLoading(false);
        }
    }

    const removeBehavior = (index: number) => {
        const newBehaviors = [...behaviorsToAdd];
        newBehaviors.splice(index, 1);
        setBehaviorsToAdd(newBehaviors);
    }

  return (
    <>
        <Header />
        <Head>
            <title>Add Behavior - BMetrics</title>
        </Head>
        <NoClientsPrompt
            isVisible={showNoClientsPrompt}
            onClose={() => setShowNoClientsPrompt(false)}
        />
        <div className={componentStyles.pageBody}>
            <main>
                {isLoading ? 
                    <Loading/> 
                    :
                    <div className={componentStyles.bodyBlock}>
                        <h1 className={componentStyles.pageHeader}>Add Behavior</h1>
                        <div className={componentStyles.tbHRSButtons}>
                            <Button nameOfClass='tbBackButton' placeholder='Back' btnType='button' isLoading={isLoading} onClick={backButtonFuctionality}/>
                        </div>
                        <p className={componentStyles.statusMessage}>{statusMessage ? <b>{statusMessage}</b> : null}</p>
                        <div className={componentStyles.innerBlock}>
                            <div className={componentStyles.tbAddBehavior}>
                                <label className={componentStyles.clientNameDropdown}>
                                    <span>Current Behavior for:</span>
                                    <SelectDropdown name={`ClientName`} requiring={true} value={selectedClientID} options={clientLists} onChange={(e) => handleClientChange({ name: e.target.options[e.target.selectedIndex].text || '', id: e.target.value})} />
                                </label>
                                <label>
                                    <span>Enter a behavior name:</span>
                                    <InputFields name="behaviorNameField" type="text" placeholder="Behavior Name" requiring={true} value={behaviorName} onChange={(e) => setBehaviorName(e.target.value)}/>
                                </label>
                                <label>
                                    <span>Select a Behavior Category:</span>
                                    <SelectDropdown name='behaviorCategoryDropdown' requiring={true} value={behaviorCategorySelected} options={behaviorCategories} onChange={(e) => setBehaviorCategorySelected(e.target.value)} />
                                </label>
                                { behaviorCategorySelected === 'Other' &&
                                    <label>
                                        <span>Enter a behavior Category:</span>
                                        <InputFields name="behaviorCategoryField" type="text" placeholder="Behavior Category" requiring={true} value={otherBehaviorCategories} onChange={(e) => setOtherBehaviorCategory(e.target.value)}/>
                                    </label>
                                }
                                <label>
                                    <span>Enter a definition for the behavior:</span>
                                    <TextareaInput name='definitionTextField' nameOfClass={componentStyles.definitionTextField} placeholder="Behavior Definition" requiring={true} value={behaviorDefinition} onChange={(e) => setBehaviorDefinition(e.target.value)}/>
                                </label>
                                <label>
                                    <span>Select a Measurement Type:</span>
                                    <SelectDropdown name='behaviorMeasurementDropdown' requiring={true} value={behaviorMeasurementSelected} options={behaviorMeasurements} onChange={(e) => setBehaviorMeasurementSelected(e.target.value)} />
                                </label>
                                <Button nameOfClass={componentStyles.tbAddButton} placeholder='Add' btnType='button' isLoading={isLoading} onClick={addBehavior}/>
                            </div>
                            { behaviorsToAdd.length > 0 &&
                                <div className={componentStyles.tbAddedBehaviors}>
                                    <h2>Behaviors to Add</h2>
                                    <ul>
                                        {behaviorsToAdd.map((behavior, index) => (
                                            <li key={index}>
                                                <div className={componentStyles.tbTitleButton}>
                                                    <h3>{behavior.behaviorName}</h3>
                                                    <Button nameOfClass='tbRemoveButton' placeholder='X' btnName='Remove' btnType='button' onClick={() => removeBehavior(index)}/>
                                                </div>
                                                <p><b>Client:</b> {behavior.clientName}</p>
                                                <p><b>Category:</b> {behavior.behaviorCategory}</p>
                                                <p><b>Definition:</b> {behavior.behaviorDefinition}</p>
                                                <p><b>Measurement:</b> {behavior.behaviorMeasurement}</p>
                                            </li>
                                        ))}
                                    </ul>
                                    <Button nameOfClass='tbSubmitButton' placeholder='Submit' btnType='button' isLoading={isLoading} onClick={debounceAsync(submitBehavior, 300)}/>
                                </div>
                            }
                        </div>
                    </div>
                }
            </main>
        </div>
    </>
  );
}

export default AddTargetBehavior;
