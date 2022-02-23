import {
    useCallback,
    useEffect,
    useRef,
    SyntheticEvent,
    ReactElement,
    FC,
    KeyboardEvent
} from "react";
import { observer } from "mobx-react";
import classNames from "classnames";
import * as Styles from "./merge-tag-editor-old.module.less";
import { useMergeTagsEditorHelpers_Old } from "../use-merge-tag-editor-helpers-old/use-merge-tag-editor-helpers-old";
import React from "react";

interface MergeTagEditorProps {
    value: string;
    onChange: (
        event: SyntheticEvent<HTMLTextAreaElement & HTMLInputElement>,
        data: any
    ) => void;
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

export const MergeTagEditor_Old: FC<MergeTagEditorProps> = observer(
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
         hasFooter
     }) => {
        const contentEditable = useRef<HTMLDivElement>(null);
        const dragTargetHTML = useRef<string | null>(null);
        const {
            processMergeTags_Old,
            transformToPlainText_Old,
            validateRemovableTags_Old,
            generateRemovedRequiredTags_Old
        } = useMergeTagsEditorHelpers_Old(mergeTags);

        useEffect(() => {
            (async () => {
                if (
                    contentEditable.current &&
                    transformToPlainText_Old(contentEditable.current) !== value
                ) {
                    contentEditable.current!.innerHTML =
                        value.trim() === "" ? "" : await processMergeTags_Old(value, mergeTags);
                }
            })();
        }, [mergeTags, processMergeTags_Old, transformToPlainText_Old, value]);

        const updateValue = useCallback(
            (event: any) => {
                if (contentEditable.current) {
                    onChange(event, {
                        value: transformToPlainText_Old(contentEditable.current)
                    });
                }
            },
            [onChange, transformToPlainText_Old]
        );

        const handleDragStart = useCallback((event: any) => {
            const target = event.target.closest("[data-merge-tag]") as HTMLDivElement;
            if (target) {
                if (document.activeElement === contentEditable.current!) {
                    dragTargetHTML.current = target.outerHTML;
                    target.classList.add("dragged");
                } else {
                    event.originalEvent.dataTransfer.setData(
                        "text/html",
                        target.outerHTML
                    );
                }
            }
        }, []);

        const handleDragOver = useCallback((event: any) => {
            event.preventDefault();
            return false;
        }, []);

        const handleDrop = useCallback(
            (event: any) => {
                const editor = contentEditable.current!;
                const content =
                    document.activeElement === editor
                        ? dragTargetHTML.current
                        : event.dataTransfer.getData("text/html");
                let range = null;

                if (document.caretRangeFromPoint) {
                    // Chrome
                    range = document.caretRangeFromPoint(event.clientX, event.clientY);
                } else if (event.rangeParent) {
                    // Firefox
                    range = document.createRange();
                    range.setStart(event.rangeParent, event.rangeOffset);
                }

                const sel = window.getSelection();

                if (content && range) {
                    sel?.removeAllRanges();
                    sel?.addRange(range);

                    editor.focus();
                    document.execCommand("insertHTML", false, content + " ");
                    sel?.removeAllRanges();
                    editor.querySelectorAll(".dragged").forEach((node) => node.remove());
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
                editor.append(" ");
            }
            onFocus();
        }, [onFocus]);

        const handleBlur = useCallback(
            async (event) => {
                const textTagElements = await generateRemovedRequiredTags_Old(
                    contentEditable.current
                );
                if (textTagElements && contentEditable.current) {
                    contentEditable.current.insertAdjacentHTML(
                        "beforeend",
                        textTagElements
                    );
                    updateValue(event);
                }
                onBlur();
            },
            [generateRemovedRequiredTags_Old, updateValue, onBlur]
        );

        const handleDelete = useCallback(
            (event: any) => {
                const target = event.target as HTMLSpanElement;
                if (target.closest(".Tag__close")) {
                    target.closest("[data-merge-tag]")?.remove();
                    updateValue(event);
                }
            },
            [updateValue]
        );

        const handleChange = useCallback(
            async (event: SyntheticEvent<HTMLDivElement>) => {
                const editor = contentEditable.current!;
                if (oneline) {
                    editor.querySelectorAll("br").forEach((node) => node.remove());
                } else {
                    editor.querySelectorAll("div").forEach((div) => {
                        if (div.classList.length === 0 && div.children.length >= 1) {
                            div.classList.add("d-b-i");
                        }
                    });
                }

                updateValue(event as any);
            },
            [updateValue, oneline]
        );

        const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
            if (oneline && event.key === "Enter") {
                event.preventDefault();
            }

            if (event.key === "Backspace") {
                validateRemovableTags_Old(event);
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
                        [Styles.oneline]: oneline
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
