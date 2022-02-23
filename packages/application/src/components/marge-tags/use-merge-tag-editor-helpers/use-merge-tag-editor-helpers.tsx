import React from 'react';
import { useCallback, useMemo, KeyboardEvent } from 'react';
import ReactDOM from 'react-dom';
import { MergeTag } from '../merge-tags-control/merge-tag';

const mergeTagToHtml: Record<string, string> = {
    '{{customer_first_name}}': `<div class="Tag _bMaMd6etahbF9CRyKqK Tag--default" title="" draggable="true" data-merge-tag="{{customer_first_name}}" data-merge-tag-required="false" contenteditable="false"><span class="Tag__body">Customer First Name</span><button class="Button Tag__close Button--grey Button--subtle Button--xsmall Button--icon-only Button--focus-visible" role="button" type="button"><span class="Button__content"><span class="Button__icon"><i class="a-Icon a-Icon--clear Button__icon-svg" width="1em" height="1em"><svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="1em" width="1em" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg></i></span></span></button></div>`,
    '{{technician_name}}': `<div class="Tag _bMaMd6etahbF9CRyKqK Tag--default" title="" draggable="true" data-merge-tag="{{technician_name}}" data-merge-tag-required="false" contenteditable="false"><span class="Tag__body">Technician Full Name</span><button class="Button Tag__close Button--grey Button--subtle Button--xsmall Button--icon-only Button--focus-visible" role="button" type="button"><span class="Button__content"><span class="Button__icon"><i class="a-Icon a-Icon--clear Button__icon-svg" width="1em" height="1em"><svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="1em" width="1em" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg></i></span></span></button></div>`,
    '{{company_name}}': `<div class="Tag _bMaMd6etahbF9CRyKqK Tag--default" title="" draggable="true" data-merge-tag="{{company_name}}" data-merge-tag-required="false" contenteditable="false"><span class="Tag__body">Company Name</span><button class="Button Tag__close Button--grey Button--subtle Button--xsmall Button--icon-only Button--focus-visible" role="button" type="button"><span class="Button__content"><span class="Button__icon"><i class="a-Icon a-Icon--clear Button__icon-svg" width="1em" height="1em"><svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="1em" width="1em" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg></i></span></span></button></div>`,
    '{{location}}': `<div class="Tag _bMaMd6etahbF9CRyKqK Tag--default" title="" draggable="true" data-merge-tag="{{location}}" data-merge-tag-required="false" contenteditable="false"><span class="Tag__body">Location</span><button class="Button Tag__close Button--grey Button--subtle Button--xsmall Button--icon-only Button--focus-visible" role="button" type="button"><span class="Button__content"><span class="Button__icon"><i class="a-Icon a-Icon--clear Button__icon-svg" width="1em" height="1em"><svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="1em" width="1em" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg></i></span></span></button></div>`,
    '{{job_type}}': `<div class="Tag _bMaMd6etahbF9CRyKqK Tag--default" title="" draggable="true" data-merge-tag="{{job_type}}" data-merge-tag-required="false" contenteditable="false"><span class="Tag__body">Job Type</span><button class="Button Tag__close Button--grey Button--subtle Button--xsmall Button--icon-only Button--focus-visible" role="button" type="button"><span class="Button__content"><span class="Button__icon"><i class="a-Icon a-Icon--clear Button__icon-svg" width="1em" height="1em"><svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="1em" width="1em" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg></i></span></span></button></div>`,
    '{{job_complete_date}}': `<div class="Tag _bMaMd6etahbF9CRyKqK Tag--default" title="" draggable="true" data-merge-tag="{{job_complete_date}}" data-merge-tag-required="false" contenteditable="false"><span class="Tag__body">Job Complete Date</span><button class="Button Tag__close Button--grey Button--subtle Button--xsmall Button--icon-only Button--focus-visible" role="button" type="button"><span class="Button__content"><span class="Button__icon"><i class="a-Icon a-Icon--clear Button__icon-svg" width="1em" height="1em"><svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="1em" width="1em" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg></i></span></span></button></div>`,
    '{{listing_link}}': `<div class="Tag _bMaMd6etahbF9CRyKqK Tag--default" title="" draggable="true" data-merge-tag="{{listing_link}}" data-merge-tag-required="true" contenteditable="false"><span class="Tag__body">Listing Link</span></div>`,
};

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
        console.log('transform to plain text');
        const editorClone = editor.cloneNode(true) as HTMLDivElement;

        editorClone.querySelectorAll('[data-merge-tag]').forEach(tag => {
            const { dataset } = tag as HTMLDivElement;
            if (dataset.mergeTag) {
                tag.textContent = dataset.mergeTag;
            }
        });

        const initialInnerHtml = editorClone.innerHTML;

        editorClone.innerHTML = editorClone.innerHTML.replace(
            /<div class="d-b-i"><br><\/div>/gi,
            '\n'
        );

        const secondInnerHtml = editorClone.innerHTML;

        // eslint-disable-next-line curly
        while (
            editorClone.innerHTML !==
            (editorClone.innerHTML = editorClone.innerHTML.replace(
                /<div class="d-b-i">([^<](.|\n)*)<\/div>/gi,
                '\n$1'
            ))
        );
        const thirdInnerHtml = editorClone.innerHTML;
        console.log(initialInnerHtml === secondInnerHtml);
        console.log(thirdInnerHtml === secondInnerHtml);

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

    const checkIfItIsMergeTag = (
        text: string,
        startIndex: number,
        mergeTags: { tag: string; label: string; required?: boolean }[]
    ) => {
        for (let i = 0; i < mergeTags.length; i++) {
            const subStringStartingFromIndex = text.substring(startIndex);

            if (subStringStartingFromIndex.startsWith(mergeTags[i].tag)) {
                return {
                    startIndex: startIndex,
                    tagLength: mergeTags[i].tag.length,
                    tagToReplace: mergeTagToHtml[mergeTags[i].tag],
                };
            }
        }
        return false;
    };

    const processMergeTags = useCallback(
        (
            text: string,
            mergeTags: { tag: string; label: string; required?: boolean }[],
        ): Promise<string> =>
            new Promise(resolve => {
                let newestValue = '';

                let i = 0;
                while (i < text.length) {
                    if (text[i] === '{' && text[i + 1] === '{') {
                        let checkResponse = checkIfItIsMergeTag(text, i, mergeTags);

                        if (checkResponse) {
                            newestValue += checkResponse.tagToReplace;
                            i += checkResponse.tagLength;
                            continue;
                        }
                    }

                    let matchWhiteSpaces = text[i].match(/[\n\t\s]/);

                    if (matchWhiteSpaces) {
                        newestValue += `<i>${matchWhiteSpaces[0]}</i>`;
                        i++;
                        continue;
                    }

                    newestValue += `<span>${text[i]}</span>`;
                    i++;
                }
                resolve(newestValue);
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
