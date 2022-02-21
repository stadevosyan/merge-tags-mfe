import React from 'react';
import { useCallback, useMemo, KeyboardEvent } from 'react';
import ReactDOM from 'react-dom';
import { MergeTag } from '../merge-tags-control/merge-tag';

interface ISelection extends Selection {
    extentOffset?: number;
}

interface IChildNode extends ChildNode {
    getAttribute(attribute: string): string | null;
}

interface IEditorMergeTags {
    tag: string;
    label: string;
    required?: boolean;
}

export const useMergeTagsEditorHelpers = (mergeTags: IEditorMergeTags[]) => {
    const transformToPlainText = useCallback((editor: HTMLDivElement): string => {
        const editorClone = editor.cloneNode(true) as HTMLDivElement;

        editorClone.querySelectorAll('[data-merge-tag]').forEach(tag => {
            const { dataset } = tag as HTMLDivElement;
            if (dataset.mergeTag) {
                tag.textContent = dataset.mergeTag;
            }
        });

        editorClone.innerHTML = editorClone.innerHTML.replace(
            /<div class="d-b-i"><br><\/div>/gi,
            '\n'
        );

        // eslint-disable-next-line curly
        while (
            editorClone.innerHTML !==
            (editorClone.innerHTML = editorClone.innerHTML.replace(
                /<div class="d-b-i">([^<](.|\n)*)<\/div>/gi,
                '\n$1'
            ))
        );

        return editorClone.innerText;
    }, []);

    const validateRemovableTags = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
        const selection: ISelection | null = document.getSelection() as ISelection;
        if (!selection?.anchorNode) {
            return;
        }

        const { extentOffset, anchorNode } = selection;
        const node = anchorNode.previousSibling as IChildNode;
        const lastElement = extentOffset === 1 || extentOffset === 0;
        const isNonDeletableTag =
            node?.getAttribute && node.getAttribute('data-merge-tag-required') === 'true';
        if (isNonDeletableTag && lastElement) {
            event.preventDefault();
        }
    }, []);

    const requiredTags = useMemo(() => {
        return mergeTags.filter(tag => tag.required);
    }, [mergeTags]);

    const generateRemovedRequiredTags = useCallback(
        async (editor: HTMLDivElement | null) => {
            if (!editor) {
                return;
            }
            const tags = [];

            for (const tagElement of requiredTags) {
                const element = editor.querySelector(`[data-merge-tag='${tagElement.tag}']`);
                if (!element) {
                    tags.push(tagElement);
                }
            }
            if (!tags) {
                return;
            }

            const text = tags
                .map(tag => {
                    return `${tag.tag}`;
                })
                .join('\n');
            return processMergeTags(text, tags);
        },
        [requiredTags]
    );

    const processMergeTags = useCallback(
        (
            text: string,
            mergeTags: { tag: string; label: string; required?: boolean }[],
            readonly = false
        ): Promise<string> =>
            new Promise(resolve => {
                let tagsCount = 0;
                let newValue = text;

                let srt = '';

                console.log('text.split()', text.split(' '));
                
                 text.split(' ').forEach((s) => {
                     if (s.match(/{{|}}/)) {
                        srt += s
                        return
                     }
                    srt += `<span>${s}</span> `
                })



                mergeTags.forEach(mergeTag => {
                    const myDiv = document.createElement('div');
                    try {
                        ReactDOM.render(
                            <MergeTag mergeTag={mergeTag} readonly={readonly} />,
                            myDiv,
                            () => {
                                const textArray = newValue.split(mergeTag.tag);
                                newValue = textArray.join(myDiv.innerHTML);

                                if (++tagsCount === mergeTags.length) {                                    
                                    resolve(newValue);
                                }
                            }
                        );
                    } catch (e) {
                        // eslint-disable-next-line no-console
                        console.warn(e);
                    }
                });
            }),
        []
    );

    return {
        processMergeTags,
        transformToPlainText,
        validateRemovableTags,
        generateRemovedRequiredTags,
    };
};
