// @ts-nocheck
import { FC, useCallback } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react';
import { InputFieldState, TextAreaFieldState } from '@servicetitan/form';
import { BodyText, Stack, TagGroup } from '@servicetitan/design-system';
import { MergeTagEditor } from './merge-tag-editor';
import { MergeTag } from './merge-tag';
import * as Styles from './merge-tags-control.module.less';
import { LabelWithHint } from '../label-with-hint/label-with-hint';
import { CenteredSpinner } from '../centered-spinner';
import { MergeTagsTargetStore } from '../use-merge-tags-target-store/use-merge-tags-target-store';
import React from 'react';

interface MergeTagsControlProps {
    formField: TextAreaFieldState<string> | InputFieldState<string>;
    maxLength: number;
    label: string;
    targetStore: MergeTagsTargetStore;
    infoText?: string;
    hideMergeTags?: boolean;
    thin?: boolean;
    hint?: string;
    mergeTagsStore: {
        mergeTags: { tag: string; label: string; required?: boolean }[];
        mergeTagsLoaded: boolean;
    };
    disabledMergeTags?: Map<string, boolean>;
}

export const MergeTagsControl: FC<MergeTagsControlProps> = observer(
    ({
        formField,
        maxLength,
        label,
        infoText,
        targetStore,
        hideMergeTags = false,
        thin = false,
        hint = 'Merge tags added to the text will be replaced by real data before sending to the customers just like in the preview example.',
        mergeTagsStore,
        disabledMergeTags = new Map(),
    }) => {
        const { mergeTags, mergeTagsLoaded } = mergeTagsStore;
        const blurHandler = useCallback(() => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                targetStore.setTargetRange(sel.getRangeAt(0));
            }
        }, [targetStore]);

        const tagClickHandler = useCallback(
            (event: any) => {
                const target = event.target?.closest('[data-merge-tag]') as HTMLDivElement;
                if (targetStore.targetRange) {
                    const sel = window.getSelection();

                    sel?.removeAllRanges();
                    sel?.addRange(targetStore.targetRange);

                    document.execCommand('insertHTML', false, target.outerHTML);
                    sel?.removeAllRanges();
                } else {
                    // eslint-disable-next-line no-console
                    console.warn('No target input field selected!');
                }
            },
            [targetStore]
        );

        const remaining = maxLength - formField.value.length;

        return (
            <div>
                <LabelWithHint className="m-b-1" label={label} hint={infoText} />
                <MergeTagEditor
                    value={formField.value}
                    onChange={formField.onChangeHandler}
                    onBlur={blurHandler}
                    error={formField.error}
                    thin={thin}
                    hasFooter={!hideMergeTags}
                    mergeTags={mergeTags}
                />
                {!hideMergeTags && (
                    <Stack
                        direction="column"
                        spacing={1}
                        className={classNames(
                            'bg-neutral-10 border p-2',
                            Styles.mergeTagsContainer
                        )}
                    >
                        <LabelWithHint label="Tags" hint={hint} textClassName="c-neutral-90" />
                        {mergeTagsLoaded ? (
                            <Stack spacing={1}>
                                <TagGroup>
                                    {mergeTags.map(mergeTag => (
                                        <MergeTag
                                            disabled={disabledMergeTags.has(mergeTag.tag)}
                                            key={mergeTag.tag}
                                            mergeTag={mergeTag}
                                            clickHandler={tagClickHandler}
                                        />
                                    ))}
                                </TagGroup>
                            </Stack>
                        ) : (
                            <CenteredSpinner />
                        )}
                    </Stack>
                )}
                <Stack className="m-t-half" justifyContent="flex-end">
                    <BodyText
                        subdued
                        size="small"
                        className={classNames({ 'c-red-400': remaining < 0 })}
                    >
                        {remaining} characters remaining
                    </BodyText>
                </Stack>
            </div>
        );
    }
);
