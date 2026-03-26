import React from 'react';
import componentStyles from '../styles/components.module.scss';

interface InputProps {
    name: string;
    requiring: boolean;
    value: string | number;
    futureDating?: boolean;
    nameOfClass?: string;
    label?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input: React.FC<InputProps> = ({ name, nameOfClass, requiring, value, futureDating, label, onChange,}) => {
    const today = new Date();
    const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split('T')[0];
    const inputId = `${name}-input`;

    const field = <input id={inputId} type='date' name={name} className={nameOfClass} required={requiring} autoComplete='off' value={value} max={!futureDating ? localDate : undefined} onChange={onChange}/>;

    if (!label) {
        return field;
    }

    return (
        <div className={componentStyles.formFieldGroup}>
            <label htmlFor={inputId} className={componentStyles.formFieldLabel}>
                {label}{requiring ? ' *' : ''}
            </label>
            {field}
        </div>
    );
}    

export default Input;