// @ts-nocheck
import {
    useCallback,
    useEffect,
    useRef,
    SyntheticEvent,
    ReactElement,
    FC,
    KeyboardEvent,
} from 'react';
import { observer } from 'mobx-react';
import classNames from 'classnames';
import * as Styles from './merge-tag-editor.module.less';
import { useMergeTagsEditorHelpers } from '../use-merge-tag-editor-helpers/use-merge-tag-editor-helpers';
import React from 'react';
import { caretPositionFromPoint, caretRangeFromPoint } from '../caret-range-from-point/caret-range-from-point';
interface MergeTagEditorProps {
    value: string;
    onChange: (event: SyntheticEvent<HTMLTextAreaElement & HTMLInputElement>, data: any) => void;
    error?: boolean | ReactElement<any> | string;
    thin?: boolean;
    hasFooter?: boolean;
    oneline?: boolean;
    placeholder?: string;
    mergeTags: { tag: string; label: string; required?: boolean }[];
    className?: string;
    outerClassName?: string;
    onBlur?(): void;
    onFocus?(): void;
}

function createSelectionFromPoint(startX, startY, endX, endY) {
    var doc = document;
    var start, end, range = null;
    if (typeof doc.caretPositionFromPoint != "undefined") {
        start = doc.caretPositionFromPoint(startX, startY);
        end = doc.caretPositionFromPoint(endX, endY);
        range = doc.createRange();
        range.setStart(start.offsetNode, start.offset);
        range.setEnd(end.offsetNode, end.offset);
    } else if (typeof doc.caretRangeFromPoint != "undefined") {
        start = doc.caretRangeFromPoint(startX, startY);
        end = doc.caretRangeFromPoint(endX, endY);
        range = doc.createRange();
        range.setStart(start.startContainer, start.startOffset);
        range.setEnd(end.startContainer, end.startOffset);
    }
    if (range !== null && typeof window.getSelection != "undefined") {
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (typeof doc.body.createTextRange != "undefined") {
        range = doc.body.createTextRange();
        range.moveToPoint(startX, startY);
        var endRange = range.duplicate();
        endRange.moveToPoint(endX, endY);
        range.setEndPoint("EndToEnd", endRange);
        range.select();
    }

    return range
}

export const MergeTagEditor: FC<MergeTagEditorProps> = observer(
    ({
        value,
        onChange,
        onBlur = () => {},
        onFocus = () => {},
        error,
        thin,
        oneline,
        placeholder,
        mergeTags,
        className,
        outerClassName,
        children,
        hasFooter,
    }) => {
        const contentEditable = useRef<HTMLDivElement>(null);
        const dragTargetHTML = useRef<string | null>(null);
        const {
            processMergeTags,
            transformToPlainText,
            validateRemovableTags,
            generateRemovedRequiredTags,
        } = useMergeTagsEditorHelpers(mergeTags);

        useEffect(() => {
            (async () => {
                if (
                    contentEditable.current &&
                    transformToPlainText(contentEditable.current) !== value
                ) {
                    contentEditable.current!.innerHTML =
                        value.trim() === '' ? '' : await processMergeTags(value, mergeTags);
                }
            })();
        }, [mergeTags, processMergeTags, transformToPlainText, value]);

        const updateValue = useCallback(
            async (event: any) => {
                if (contentEditable.current) {
                    onChange(event, {
                        value: transformToPlainText(contentEditable.current),
                    });
                }

                if (
                    contentEditable.current &&
                    transformToPlainText(contentEditable.current) !== value
                ) {
                    contentEditable.current!.innerHTML =
                        value.trim() === '' ? '' : await processMergeTags(transformToPlainText(contentEditable.current), mergeTags);
                }
            },
            [onChange, transformToPlainText]
        );

        const handleDragStart = useCallback((event: any) => {
            const target = event.target.closest('[data-merge-tag]') as HTMLDivElement;
            if (target) {
                if (document.activeElement === contentEditable.current!) {
                    dragTargetHTML.current = target.outerHTML;
                    target.classList.add('dragged');
                } else {
                    event.originalEvent.dataTransfer.setData('text/html', target.outerHTML);
                }
            }
        }, []);

        const handleDragOver = useCallback((event: any) => {
            console.log('dragggg');
            event.preventDefault();
            return false;
        }, []);

        const handleDrop = useCallback(
            (event: any) => {
                console.log('drop: ', event);
                const editor = contentEditable.current!;
                const content =
                    document.activeElement === editor
                        ? dragTargetHTML.current
                        : event.dataTransfer.getData('text/html');
                console.log('content: ', content);
                
                        
                let range = null;

                if (document.caretRangeFromPoint) {
                    // Chrome
                    range = document.caretRangeFromPoint(event.clientX, event.clientY);
                    const s = document.elementFromPoint(event.clientX, event.clientY)
                    console.log('s: ', s);
                    
                } else if (event.rangeParent) {
                    // Firefox
                    range = document.createRange();
                    range.setStart(event.rangeParent, event.rangeOffset);
                }
                

                console.log({
                    clientX: event.clientX, 
                    clientY: event.clientY, 
                    content,
                    range,
                });

                // const sel = document.body.firstElementChild.root.getSelection();

                const sel = window.getSelection();

                if (content && range) {
                    sel?.removeAllRanges();
                    sel?.addRange(range);

                    editor.focus();
                    document.execCommand('insertHTML', false, content + ' ');
                    sel?.removeAllRanges();
                    editor.querySelectorAll('.dragged').forEach(node => node.remove());
                    dragTargetHTML.current = null;
                    editor.focus();
                }

                updateValue(event);
            },
            [updateValue]
        );

        const handleFocus = useCallback(() => {
            const editor = contentEditable.current;
            if (editor && editor.lastChild?.nodeType === 1) {
                editor.append(' ');
            }
            onFocus();
        }, [onFocus]);

        const handleBlur = useCallback(
            async event => {
                const textTagElements = await generateRemovedRequiredTags(contentEditable.current);
                if (textTagElements && contentEditable.current) {
                    contentEditable.current.insertAdjacentHTML('beforeend', textTagElements);
                    updateValue(event);
                }
                onBlur();
            },
            [generateRemovedRequiredTags, updateValue, onBlur]
        );

        const handleDelete = useCallback(
            (event: any) => {
                const target = event.target as HTMLSpanElement;
                if (target.closest('.Tag__close')) {
                    target.closest('[data-merge-tag]')?.remove();
                    updateValue(event);
                }
            },
            [updateValue]
        );

        const handleChange = useCallback(
            async (event: SyntheticEvent<HTMLDivElement>) => {
                const editor = contentEditable.current!;
                if (oneline) {
                    editor.querySelectorAll('br').forEach(node => node.remove());
                } else {
                    editor.querySelectorAll('div').forEach(div => {
                        if (div.classList.length === 0 && div.children.length >= 1) {
                            div.classList.add('d-b-i');
                        }
                    });
                }

                updateValue(event as any);
            },
            [updateValue, oneline]
        );

        const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
            if (oneline && event.key === 'Enter') {
                event.preventDefault();
            }

            if (event.key === 'Backspace') {
                validateRemovableTags(event);
            }
        };

        return (
            <div className={outerClassName}>
                <div
                    ref={contentEditable}
                    className={classNames(Styles.editor, className, {
                        [Styles.editorError]: !!error,
                        [Styles.thin]: thin,
                        [Styles.hasFooter]: hasFooter,
                        [Styles.oneline]: oneline,
                    })}
                    onClick={handleDelete}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onInput={handleChange}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
                    contentEditable
                    placeholder={placeholder}
                />
                {children}
                {error && <div className={Styles.errorText}>{error}</div>}
            </div>
        );
    }
);
