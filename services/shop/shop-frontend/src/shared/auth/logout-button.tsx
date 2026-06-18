import {useAuth} from './authentication-provider.tsx';
import {Button} from '@mui/material';
import React, {PropsWithChildren} from 'react';

interface Props {
    color?: "inherit" | "primary";
}

export const LogoutButton: React.FC<PropsWithChildren<Props>> = (props) => {
    const {keycloak} = useAuth();
    const performLogout = () => keycloak.logout({redirectUri: window.location.origin});

    return (
        <Button color={props.color} onClick={performLogout}>
            Logout
        </Button>
    );
};
