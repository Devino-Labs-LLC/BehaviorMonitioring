"use client";
import '../styles/timerStyle.css';
import React, { useState } from 'react';
import { FaAngleUp, FaAngleDown } from 'react-icons/fa';

interface CustomTimerProps {
    initialValue: string;
    name: string;
    required: boolean;
    onChange: (time: { hour: number; minute: number; second: number }) => void;
}

const CustomTimer: React.FC<CustomTimerProps> = ({ initialValue = "00:00:00", name, required, onChange }) => {
    const parseTimeString = (timeString: string) => {
        const [hour, minute, second] = timeString.split(':').map(Number);
        return { hour, minute, second };
    };

    const initialTime = parseTimeString(initialValue);

    const [hour, setHour] = useState<number>(initialTime.hour);
    const [minute, setMinute] = useState<number>(initialTime.minute);
    const [second, setSecond] = useState<number>(initialTime.second);

    const updateTime = (newHour: number, newMinute: number, newSecond: number) => {
        setHour(newHour);
        setMinute(newMinute);
        setSecond(newSecond);
        if (onChange) {
            onChange({ hour: newHour, minute: newMinute, second: newSecond });
        }
    };

    const incrementHour = () => {
        updateTime(hour + 1, minute, second);
    };

    const decrementHour = () => {
        let newHour = hour - 1;
        if (newHour <= -1) {
            newHour = 0;
        }
        updateTime(newHour, minute, second);
    };

    const incrementMinute = () => {
        const newMinute = (minute + 1) % 60;
        const newHour = newMinute === 0 ? hour + 1 : hour;
        updateTime(newHour, newMinute, second);
    };

    const decrementMinute = () => {
        let newMinute = (minute - 1 + 60) % 60;
        let newHour = newMinute === 59 ? hour - 1 : hour;
        if (newMinute <= -1) {
            newMinute = 0;
        }
        
        if (newHour <= 0) {
            newHour = 0;
        }
        updateTime(newHour, newMinute, second);
    };

    const incrementSecond = () => {
        const newSecond = (second + 1) % 60;
        const newMinute = newSecond === 0 ? minute + 1 : minute;
        const newHour = newMinute === 60 ? hour + 1 : hour;
        updateTime(newHour, newMinute % 60, newSecond);
    };

    const decrementSecond = () => {
        let newSecond = (second - 1 + 60) % 60;
        let newMinute = newSecond === 59 ? minute - 1 : minute;
        let newHour = newMinute === -1 ? hour - 1 : hour;
        if (newSecond <= -1) {
            newSecond = 0;
        }
        if (newMinute <= 0) {
            newMinute = 0;
        }
        if (newHour <= 0) {
            newHour = 0;
        }

        updateTime(newHour, (newMinute + 60) % 60, newSecond);
    };

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number.parseInt(e.target.value, 10);
        if (!Number.isNaN(value) && value >= 0) {
            setHour(value);
            updateTime(value, minute, second);
        }
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number.parseInt(e.target.value, 10);
        if (!Number.isNaN(value) && value >= 0 && value < 60) {
            setMinute(value);
            updateTime(hour, value, second);
        }
    };

    const handleSecondChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number.parseInt(e.target.value, 10);
        if (!Number.isNaN(value) && value >= 0 && value < 60) {
            setSecond(value);
            updateTime(hour, minute, value);
        }
    };

    return (
        <div className={`ng-timepicker ${name}`}>
            <table>
                <thead>
                    <tr>
                        <th scope="col">Hours</th>
                        <th scope="col"></th>
                        <th scope="col">Minutes</th>
                        <th scope="col"></th>
                        <th scope="col">Seconds</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="act noselect" onClick={incrementHour}><FaAngleUp /></td>
                        <td></td>
                        <td className="act noselect" onClick={incrementMinute}><FaAngleUp /></td>
                        <td></td>
                        <td className="act noselect" onClick={incrementSecond}><FaAngleUp /></td>
                    </tr>
                    <tr>
                        <td>
                            <input type="number" className={name} aria-label={'Duration hours input field'} required={required} value={String(hour).padStart(2, '0')} onChange={handleHourChange}
                            />
                        </td>
                        <td>:</td>
                        <td>
                            <input type="number" className={name} aria-label={'Duration minutes input field'} required={required} value={String(minute).padStart(2, '0')} onChange={handleMinuteChange}
                            />
                        </td>
                        <td>:</td>
                        <td>
                            <input type="number" className={name} aria-label={'Duration seconds input field'} required={required} value={String(second).padStart(2, '0')} onChange={handleSecondChange} />
                        </td>
                    </tr>
                    <tr>
                        <td className="act noselect" onClick={decrementHour}><FaAngleDown /></td>
                        <td></td>
                        <td className="act noselect" onClick={decrementMinute}><FaAngleDown /></td>
                        <td></td>
                        <td className="act noselect" onClick={decrementSecond}><FaAngleDown /></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default CustomTimer;
