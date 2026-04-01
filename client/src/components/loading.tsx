import React from 'react';
import componentStyles from '../styles/components.module.scss';

const Loading: React.FC = () => {
    return (
        <div className={componentStyles.loadingBody}>
            <div className={componentStyles.loadingBodyForm}>
                <div className={componentStyles.lgLogo} />
                <h1>Loading...</h1>
            </div>
        </div>
    );
}

export default Loading;
