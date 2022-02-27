import {
    useCallback,
    useEffect,
    useRef,
    SyntheticEvent,
    ReactElement,
    FC,
    KeyboardEvent,
    useState,
} from 'react';
import { observer } from 'mobx-react';
import classNames from 'classnames';
import * as Styles from './merge-tag-editor.module.less';
import {
    ContentNodeType,
    TextTypeAttribute,
    useMergeTagsEditorHelpers,
} from '../use-merge-tag-editor-helpers/use-merge-tag-editor-helpers';
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
            textToTags,
            transformToPlainText,
            validateRemovableTags,
            generateRemovedRequiredTags,
        } = useMergeTagsEditorHelpers(mergeTags);

        const [isDirty, setIsDirty] = useState(false);

        const getRoot = () =>
            document.activeElement?.shadowRoot?.toString() === '[object ShadowRoot]'
                ? document.activeElement!.shadowRoot!
                : document;

        const handleDrop = useCallback((event: DragEvent) => {
            const editor = contentEditable.current!;
            const content =
                getRoot().activeElement === editor
                    ? dragTargetHTML.current
                    : event!.dataTransfer!.getData('text/html');

            const composedPath = event.composedPath();
            const targetElement = composedPath[0] as HTMLElement;

            let insertBefore = shouldInsertBefore(targetElement);

            // TODO! test handle first and last child cases
            {
                const newElement = document.createElement('div');
                newElement.innerHTML = content!;
                const { children } = newElement;

                // TODO! check previous/next item content to decide if space char is needed to concat
                const insertionNode = Array.from(children)[children.length - 1]!;

                if (insertBefore) {
                    editor.insertBefore(insertionNode, targetElement);
                } else {
                    editor.insertBefore(insertionNode, targetElement.nextSibling);
                }
            }

            dragTargetHTML.current = null;
            editor.querySelectorAll('.dragged').forEach(node => node.remove());
        }, []);

        useEffect(() => {
            if (contentEditable.current) {
                contentEditable.current.addEventListener('drop', handleDrop);

                return () => {
                    document.removeEventListener('drop', handleDrop);
                };
            }
        }, [contentEditable.current]);

        useEffect(() => {
            (async () => {
                contentEditable.current!.innerHTML =
                    value.trim() === '' ? '' : await textToTags(value, mergeTags);
            })();
        }, [mergeTags, textToTags]);

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
                if (isDirty) {
                    const editor = contentEditable.current!;
                    const contentToText = transformToPlainText(editor);

                    editor.innerHTML = await textToTags(contentToText, mergeTags);

                // TODO!: logic needs to be reconsidered
                // TODO!: logic needs to be considered for onChange as well
                const textTagElements = await generateRemovedRequiredTags(contentEditable.current);
                if (textTagElements && contentEditable.current) {
                    contentEditable.current.insertAdjacentHTML('beforeend', textTagElements);
                }

                    setIsDirty(false);
                }
                onBlur();
            },
            [generateRemovedRequiredTags, onBlur, isDirty, setIsDirty]
        );

        const handleDelete = useCallback((event: any) => {
            const target = event.target as HTMLSpanElement;
            if (target.closest('.Tag__close')) {
                target.closest('[data-merge-tag]')?.remove();
            }
        }, []);

        const handleChange = useCallback(
            async (event: SyntheticEvent<HTMLDivElement>) => {
                const editor = contentEditable.current!;
                // TODO, double check might be needed to remove some other way
                if (oneline) {
                    editor.querySelectorAll('br').forEach(node => node.remove());
                } else {
                    editor.querySelectorAll('div').forEach(div => {
                        if (div.classList.length === 0 && div.children.length >= 1) {
                            div.classList.add('d-b-i');
                        }
                    });
                }

                // to reconstruct tags onBlur event
                setIsDirty(true);
            },
            [oneline]
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

const insertOnTextNode = () => {};

const shouldInsertBefore = (element: HTMLElement) => {
    let insertBefore;
    if (element?.getAttribute('data-node-type') === ContentNodeType.Text) {
        const textType = element.getAttribute('data-text-type');

        switch (textType) {
            case TextTypeAttribute.RightText:
            case TextTypeAttribute.FirstSpace:
            case TextTypeAttribute.NewLine: {
                insertBefore = false;
                break;
            }
            case TextTypeAttribute.LeftText:
            case TextTypeAttribute.NotFirstSpace:
            case TextTypeAttribute.SingleChar: {
                insertBefore = true;
                break;
            }
        }
    } else {
        // if it is merge tag
        insertBefore = false;
    }

    return insertBefore;
};
