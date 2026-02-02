import React from 'react';
import { useRouter } from 'next/navigation';
import componentStyles from '../styles/components.module.scss';

interface EmptyStatePromptProps {
    title: string;
    message: string;
    isVisible: boolean;
    navigationPath?: string;
    navigationLabel?: string;
    onClose?: () => void;
}

const EmptyStatePrompt: React.FC<EmptyStatePromptProps> = ({ 
    title, 
    message, 
    isVisible, 
    navigationPath,
    navigationLabel = 'Go',
    onClose 
}) => {
    const router = useRouter();

    if (!isVisible) return null;

    const handleNavigate = () => {
        if (navigationPath) {
            router.push(navigationPath);
        }
    };

    return (
        <div className={componentStyles.popupOverlay}>
            <div className={componentStyles.popupContent}>
                <h2>{title}</h2>
                <p>{message}</p>
                <div className={componentStyles.popupActions}>
                    {navigationPath && (
                        <button onClick={handleNavigate} aria-label={navigationLabel}>
                            {navigationLabel}
                        </button>
                    )}
                    {onClose && (
                        <button onClick={onClose} aria-label="Close">
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmptyStatePrompt;
