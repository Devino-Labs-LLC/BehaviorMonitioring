import React from 'react';
import componentStyles from '../styles/components.module.scss';

interface SelectDropdownProps {
    name: string;
    requiring: boolean;
    value: string | number;
    options: | { value: string | number; label: string }[];
    label?: string;
    placeholderOption?: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SelectDropdown: React.FC<SelectDropdownProps> = ({ name, requiring, value, options, label, placeholderOption, onChange }) => {
    const selectId = `${name}-select`;

    const field = (
        <select name={name} value={value} required={requiring} onChange={onChange}>
            {placeholderOption ? (
                <option value="" disabled>
                    {placeholderOption}
                </option>
            ) : null}
            {options.map((option) => (
                <option key={String(option.value)} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );

    if (!label) {
        return field;
    }

    return (
        <div className={componentStyles.formFieldGroup}>
            <label htmlFor={selectId} className={componentStyles.formFieldLabel}>
                {label}{requiring ? ' *' : ''}
            </label>
            <select id={selectId} name={name} value={value} required={requiring} onChange={onChange}>
                {placeholderOption ? (
                    <option value="" disabled>
                        {placeholderOption}
                    </option>
                ) : null}
                {options.map((option) => (
                    <option key={String(option.value)} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default SelectDropdown;
