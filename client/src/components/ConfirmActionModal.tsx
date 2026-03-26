import React from 'react';
import componentStyles from '../styles/components.module.scss';

interface ConfirmActionModalProps {
    isVisible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isSubmitting?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
    isVisible,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isSubmitting = false,
    onConfirm,
    onCancel
}) => {
    if (!isVisible) {
        return null;
    }

    return (
        <div className={componentStyles.popupOverlay} role="dialog" aria-modal="true" aria-label={title}>
            <div className={componentStyles.popupContent}>
                <h2>{title}</h2>
                <p>{message}</p>
                <div className={componentStyles.popupActions}>
                    <button type="button" onClick={onCancel} disabled={isSubmitting}>
                        {cancelLabel}
                    </button>
                    <button type="button" onClick={onConfirm} disabled={isSubmitting} data-testid="confirm-action-button">
                        {isSubmitting ? 'Submitting...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmActionModal;
