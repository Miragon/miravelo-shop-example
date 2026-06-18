import React, {PropsWithChildren} from 'react';

export const LoginBarrier: React.FC<PropsWithChildren> = ({children}) => {
    return <React.Fragment>{children}</React.Fragment>;
};
