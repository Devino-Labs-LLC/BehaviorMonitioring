import React from 'react';
import componentStyles from '../styles/components.module.scss';

interface TextareaInputProps {
    name: string;
    placeholder: string;
    requiring: boolean;
    value: string;
    nameOfClass: string;
    label?: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const TextareaInput: React.FC<TextareaInputProps> = ({ name, nameOfClass, placeholder, requiring, value, label, onChange }) => {
    const inputId = `${name}-textarea`;
    const field = <textarea id={inputId} name={name} className={nameOfClass} placeholder={placeholder} aria-label={placeholder + ' text field'} required={requiring} autoComplete="off" value={value} onChange={onChange} />;

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
};

export default TextareaInput;