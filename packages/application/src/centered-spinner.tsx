import { FC } from 'react';
import classnames from 'classnames';
import { Stack, Spinner } from '@servicetitan/design-system';
import React from 'react';

interface CenteredSpinnerPropsStrict {
    /** Size variants */
    size?: 'large' | 'medium' | 'small' | 'tiny';
    className?: string;
}

export const CenteredSpinner: FC<CenteredSpinnerPropsStrict> = ({ size, className }) => {
    return (
        <Stack
            justifyContent="center"
            alignItems="center"
            className={classnames(className, 'h-100 w-100')}
        >
            <Spinner className="of-hidden" size={size} />
        </Stack>
    );
};
