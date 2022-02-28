import { SyntheticEvent, FC, DragEvent } from 'react';
import { Tag } from '@servicetitan/design-system';
import classNames from 'classnames';

import * as Styles from './merge-tag.module.less';
import React from 'react';
import { ContentNodeType } from '../use-merge-tag-editor-helpers/use-merge-tag-editor-helpers';

interface MergeTagProps {
    mergeTag: { tag: string; label: string; required?: boolean };
    clickHandler?: (event: SyntheticEvent<HTMLTextAreaElement & HTMLInputElement>) => void;
    disabled?: boolean;
    readonly?: boolean;
}

export const MergeTag: FC<MergeTagProps> = ({
    mergeTag: { tag, label, required },
    clickHandler = () => {},
    disabled,
    readonly,
}) => {
    // TODO ref forwarding from parent will help to cleanup dataTransfer setData/getData logic
    const dragHandler = (evt: DragEvent) => {
        const target = evt.target as HTMLSpanElement;
        evt.dataTransfer?.setData('text/html', target?.outerHTML);
    };

    return (
        <Tag
            draggable={!disabled && !readonly}
            className={classNames({
                [Styles.mergeTag]: true,
                'c-neutral-90-i': disabled,
                'cursor-not-allowed': disabled,
            })}
            data-merge-tag={tag}
            data-merge-tag-required={required}
            data-node-type={ContentNodeType.MergeTag}
            contentEditable={false}
            onDragStart={!disabled && !readonly ? dragHandler : undefined}
            onClose={!required && !readonly ? () => {} : undefined}
            onClick={!disabled && !readonly ? clickHandler : undefined}
            title=""
        >
            {label}
        </Tag>
    );
};
