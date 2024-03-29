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
    isTextElement,
    TextTypeAttribute,
    useMergeTagsEditorHelpers,
} from '../use-merge-tag-editor-helpers/use-merge-tag-editor-helpers';
import React from 'react';

interface MergeTagEditorProps {
    value: string;
    onChange: (event: SyntheticEvent<HTMLTextAreaElement & HTMLInputElement>, data: any) => void;
    error?: boolean | ReactElement | string;
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
        const internalActiveDragElement = useRef<HTMLElement | null>(null);

        const {
            textToTags,
            transformToPlainText,
            validateRemovableTags,
            generateRemovedRequiredTags,
        } = useMergeTagsEditorHelpers(mergeTags);

        const [isDirty, setIsDirty] = useState(false);

        // works as component did mount with no future updates
        useEffect(() => {
            (async () => {
                contentEditable.current!.innerHTML =
                    value.trim() === '' ? '' : await textToTags(value, mergeTags);
            })();
        }, []);

        const handleDrop = useCallback((event: any) => {
            const editor = contentEditable.current!;
            // TODO ref forwarding for merge-tag and merge-tag editor components, will help to get rid of dataTransfer setData/getData logic
            const content = event?.dataTransfer?.getData('text/html');

            const dropTarget = event.target as HTMLElement;
            const dropTargetRoot = dropTarget.closest('[data-node-type]') as HTMLElement;

            if (!content || !dropTargetRoot) {
                return;
            }
            const { insertBefore, addExtraSpace } = dropExtraInfo(dropTargetRoot);

            const newElement = document.createElement('div');
            newElement.innerHTML = content!;
            const { children } = newElement;

            // take last element, cuz for merge tag first child is its meta
            const insertionNode = Array.from(children)[children.length - 1]!;

            if (insertBefore) {
                editor.insertBefore(insertionNode, dropTargetRoot);
                if (addExtraSpace) {
                    const whiteSpaceElement = document.createElement('span');
                    whiteSpaceElement.innerText = ' ';
                    editor.insertBefore(whiteSpaceElement, dropTargetRoot);
                }
            } else {
                editor.insertBefore(insertionNode, dropTargetRoot.nextSibling);
                if (addExtraSpace) {
                    const whiteSpaceElement = document.createElement('span');
                    whiteSpaceElement.innerText = ' ';
                    editor.insertBefore(whiteSpaceElement, insertionNode);
                }
            }

            if (internalActiveDragElement.current) {
                removeNeighboringSpaceElement(internalActiveDragElement.current);
                internalActiveDragElement.current?.remove();
                internalActiveDragElement.current = null;
            }

            editor.focus();
            onChange(event as any, { data: transformToPlainText(editor) });
        }, []);

        // TODO double check if this code is needed, because it is already available inside merge tag component
        const handleDragStart = useCallback((event: any) => {
            const target = event.target.closest('[data-merge-tag]') as HTMLDivElement;

            // TODO if is dirty, during on drag most probably is needed to trigger text to tags logic

            if (target) {
                event.dataTransfer.setData('text/html', target.outerHTML);
                internalActiveDragElement.current = target;
            }
        }, []);

        const handleDragEnd = useCallback((event: any) => {
            // if merge tag is not dropped remove stored draggable element, not to remove the element later
            internalActiveDragElement.current = null;
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

        const handleBlur = useCallback(async () => {
            if (isDirty) {
                const editor = contentEditable.current!;
                const contentToText = transformToPlainText(editor);

                editor.innerHTML = await textToTags(contentToText, mergeTags);

                // TODO onChange is not triggered after adding required tags
                const textTagElements = await generateRemovedRequiredTags(contentEditable.current);
                if (textTagElements && contentEditable.current) {
                    contentEditable.current.insertAdjacentHTML('beforeend', textTagElements);
                }

                setIsDirty(false);
            }
            onBlur();
        }, [generateRemovedRequiredTags, onBlur, isDirty, setIsDirty]);

        const handleDelete = useCallback((event: any) => {
            const target = event.target as HTMLSpanElement;
            if (target.closest('.Tag__close')) {
                const mergeTag = target.closest('[data-merge-tag]')! as HTMLElement;
                removeNeighboringSpaceElement(mergeTag);
                mergeTag.remove();
            }
        }, []);

        const handleChange = useCallback(
            async (event: SyntheticEvent<HTMLDivElement>) => {
                const editor = contentEditable.current!;
                if (oneline) {
                    editor.querySelectorAll('br').forEach(node => node.remove());
                } else {
                    /*
                     * TODO causes another bug, needs to be investigated
                     * as content of our editor consists only from html element, and no clean text content at all,
                     * adding new line by default is added using classes and attributes of the previous element and we need to reset it
                     *
                     */
                    editor.querySelectorAll('div').forEach(div => {
                        if (div.classList.length === 0 && div.children.length >= 1) {
                            div.classList.add('d-b-i');
                            if (div.children.length > 1) {
                                const fragment = document.createDocumentFragment();
                                const nodes = Array.from(div.children) as Node[];
                                fragment.append(...nodes);
                                div.innerHTML = '<br>';
                                if (div.nextSibling) {
                                    div.nextSibling.insertBefore(fragment, div);
                                } else {
                                    div.parentElement!.appendChild(fragment);
                                }
                            }
                        }
                    });
                }

                // to reconstruct tags during onBlur event
                setIsDirty(true);
                onChange(event as any, { data: transformToPlainText(editor) });
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
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onInput={handleChange}
                    onDrop={handleDrop}
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

const removeNeighboringSpaceElement = (node: HTMLElement) => {
    const leftSibling = node.previousElementSibling as HTMLElement;
    if (leftSibling && isTextElement(leftSibling)) {
        leftSibling.remove();
    } else {
        const rightSibling = node.nextElementSibling as HTMLElement;
        if (rightSibling && isTextElement(rightSibling)) {
            rightSibling.remove();
        }
    }
};

const dropExtraInfo = (element: HTMLElement) => {
    let insertBefore;
    let addExtraSpace;

    if (element?.getAttribute('data-node-type') === ContentNodeType.Text) {
        const textType = element.getAttribute('data-text-type');

        switch (textType) {
            case TextTypeAttribute.FirstSpace:
            case TextTypeAttribute.RightText: {
                insertBefore = false;
                addExtraSpace = true;
                break;
            }
            case TextTypeAttribute.NewLine: {
                insertBefore = false;
                addExtraSpace = false;
                break;
            }
            case TextTypeAttribute.SingleChar:
            case TextTypeAttribute.LeftText: {
                insertBefore = true;
                addExtraSpace = true;
                break;
            }
            case TextTypeAttribute.NotFirstSpace: {
                insertBefore = true;
                addExtraSpace = false;
                break;
            }
        }
    } else {
        // if the drop target is merge-tag
        insertBefore = false;
        addExtraSpace = true;
    }

    return {
        insertBefore,
        addExtraSpace,
    };
};
