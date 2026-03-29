"use client";

import React, { useEffect, useState } from 'react';
import EmptyStatePrompt from './EmptyStatePrompt';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/Api';

interface NoClientsPromptProps {
    isVisible: boolean;
    onClose?: () => void;
}

const NoClientsPrompt: React.FC<NoClientsPromptProps> = ({ isVisible, onClose }) => {
    const { isReady, isLoggedIn, username } = useAuth();
    const [hasHomes, setHasHomes] = useState<boolean | null>(null);

    useEffect(() => {
        if (!isVisible) {
            setHasHomes(null);
            return;
        }

        if (!isReady || !isLoggedIn || !username) {
            return;
        }

        let mounted = true;

        (async () => {
            try {
                const response = await api<any>('post', '/admin/getAllHomes', {
                    employeeUsername: username
                });

                if (!mounted) {
                    return;
                }

                if (response.statusCode === 200 && Array.isArray(response.homes)) {
                    setHasHomes(response.homes.length > 0);
                } else {
                    setHasHomes(false);
                }
            } catch {
                if (mounted) {
                    setHasHomes(false);
                }
            }
        })();

        return () => {
            mounted = false;
        };
    }, [isVisible, isReady, isLoggedIn, username]);

    if (!isVisible || hasHomes === null) {
        return null;
    }

    return (
        <EmptyStatePrompt
            title={hasHomes ? "No Clients Found" : "No Homes Found"}
            message={
                hasHomes
                    ? "You don't have any clients yet. Would you like to add a new client to get started?"
                    : "You need to add a home before creating your first client. Would you like to add a home now?"
            }
            isVisible={isVisible}
            navigationPath={hasHomes ? "/Admin/manageClients/add" : "/Admin/manageHomes/add"}
            navigationLabel={hasHomes ? "Add New Client" : "Add New Home"}
            onClose={onClose}
        />
    );
};

export default NoClientsPrompt;
