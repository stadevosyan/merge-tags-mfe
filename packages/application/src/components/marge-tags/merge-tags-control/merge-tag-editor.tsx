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

        const getRoot = () =>
            document.activeElement?.shadowRoot?.toString() === '[object ShadowRoot]'
                ? document.activeElement!.shadowRoot!
                : document;

        const findInsertPosition = (
            children: Element[],
            index: number,
            moveIndexNumber = 1
        ): {
            direction: 'left' | 'right';
            node: Element;
        } => {
            let leftIndex = index - moveIndexNumber;
            if (leftIndex === -1) {
                return {
                    direction: 'left',
                    node: children[0],
                };
            }

            let rightIndex = index + moveIndexNumber;

            if (rightIndex === children.length) {
                return {
                    direction: 'right',
                    node: children[children.length - 1],
                };
            }

            const leftContentIsInsertPosition =
                children[leftIndex].innerHTML === ' ' ||
                children[leftIndex].innerHTML === '\n' ||
                children[leftIndex].innerHTML === '\t';
            if (leftContentIsInsertPosition) {
                return {
                    direction: 'left',
                    node: children[leftIndex],
                };
            }

            const rightContentIsInsertPosition =
                children[rightIndex].innerHTML === ' ' ||
                children[rightIndex].innerHTML === '\n' ||
                children[rightIndex].innerHTML === '\t';
            if (rightContentIsInsertPosition) {
                return {
                    direction: 'right',
                    node: children[rightIndex],
                };
            }

            return findInsertPosition(children, index, moveIndexNumber + 1);
        };

        const handleNVFocus = useCallback((event: DragEvent) => {
            const editor = contentEditable.current!;
            // TODO-Sam: understand the reason of check
            const content =
                getRoot().activeElement === editor
                    ? dragTargetHTML.current
                    : event!.dataTransfer!.getData('text/html');

            const composedPath = event.composedPath();
            const targetElement = composedPath[0] as HTMLElement;
            const parent = editor;

            const childrenArray = Array.from(parent.children);
            const index = childrenArray.indexOf(targetElement);

            let abc = findInsertPosition(childrenArray, index);
            const { direction, node } = abc;
            if (direction === 'right') {
                const newElement = document.createElement('b');
                newElement.innerHTML = ' ' + content!;
                parent.insertBefore(newElement, node);
            } else {
                const newElement = document.createElement('b');
                newElement.innerHTML = content! + ' ';
                parent.insertBefore(newElement, node.nextSibling);
            }
            editor.querySelectorAll('.dragged').forEach(node => node.remove());
        }, []);

        useEffect(() => {
            if (contentEditable.current) {
                contentEditable.current.addEventListener('drop', handleNVFocus);

                return () => {
                    document.removeEventListener('drop', handleNVFocus);
                };
            }
        }, [contentEditable.current]);

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
            (event: any) => {
                if (contentEditable.current) {
                    onChange(event, {
                        value: transformToPlainText(contentEditable.current),
                    });
                }
            },
            [onChange, transformToPlainText]
        );

        const handleDragStart = useCallback((event: any) => {
            const target = event.target.closest('[data-merge-tag]') as HTMLDivElement;

            if (target) {
                if (getRoot().activeElement === contentEditable.current!) {
                    dragTargetHTML.current = target.outerHTML;
                    target.classList.add('dragged');
                } else {
                    event.originalEvent.dataTransfer.setData('text/html', target.outerHTML);
                }
            }
        }, []);

        const handleDragOver = useCallback((event: any) => {
            event.preventDefault();
            return false;
        }, []);

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
