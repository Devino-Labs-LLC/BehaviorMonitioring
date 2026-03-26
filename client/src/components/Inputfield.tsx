import React from 'react';
import componentStyles from '../styles/components.module.scss';

interface InputProps {
    name: string;
    type: string;
    placeholder: string;
    requiring: boolean;
    value: string | number;
    label?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input: React.FC<InputProps> = ({ name, type, placeholder, requiring, value, label, onChange }) => {
    const inputId = `${name}-input`;

    const renderInput = () => {
    switch (type) {
        case ('number') :
            return <input id={inputId} type='number' name={name} placeholder={placeholder} aria-label={placeholder + ' text field'} required={requiring} autoComplete="off" value={value} onChange={onChange} onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}/>
        case ('tel') :
            return <input id={inputId} type='tel' name={name} placeholder={placeholder} aria-label={placeholder + ' text field'} required={requiring} autoComplete="off" value={value} onChange={onChange} />
        case ('password') :
            return <input id={inputId} type='password' name={name} placeholder={placeholder} aria-label={placeholder + ' text field'} required={requiring} autoComplete="off" value={value} onChange={onChange} />
        case ('email') :
            return <input id={inputId} type='email' name={name} placeholder={placeholder} aria-label={placeholder + ' text field'} required={requiring} autoComplete="off" value={value} onChange={onChange} />
        default:
            return <input id={inputId} type='text' name={name} placeholder={placeholder} aria-label={placeholder + ' text field'} required={requiring} autoComplete="off" value={value} onChange={onChange} />
        };    
    };

    if (!label) {
        return renderInput();
    }

    return (
        <div className={componentStyles.formFieldGroup}>
            <label htmlFor={inputId} className={componentStyles.formFieldLabel}>
                {label}{requiring ? ' *' : ''}
            </label>
            {renderInput()}
        </div>
    );
}    

export default Input;