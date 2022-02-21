import { BodyText, Icon, Stack, Tooltip } from '@servicetitan/design-system';
import tokens from '@servicetitan/tokens';
import React from 'react';
import { FC } from 'react';

export const LabelWithHint: FC<{
    label: string;
    hint?: string;
    textClassName?: string;
    className?: string;
    textSize?: 'large' | 'medium' | 'small' | 'xsmall';
}> = ({ label, textClassName, className, hint, textSize = 'small' }) => (
    <Stack spacing={1} alignItems="flex-start" className={className}>
        <BodyText size={textSize} bold className={textClassName}>
            {label}
        </BodyText>
        {!!hint && (
            <Tooltip direction="tr" text={hint}>
                <Icon name="info" size={18} color={tokens.colorNeutral80} />
            </Tooltip>
        )}
    </Stack>
);
