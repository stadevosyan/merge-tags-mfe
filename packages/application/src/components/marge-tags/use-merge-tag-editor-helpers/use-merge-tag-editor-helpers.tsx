import React from 'react';
import { useCallback, useMemo, KeyboardEvent } from 'react';
import ReactDOM from 'react-dom';
import { MergeTag } from '../merge-tags-control/merge-tag';

const mergeTagToHtml = new Map<string, string>();

interface ISelection extends Selection {
    extentOffset?: number;
}

export enum ContentNodeType {
    Text = 'text',
    MergeTag = 'merge-tag',
}

interface IMergeTagInfo {
    insertIndex: number;
    tagToReplace: string;
}

export enum TextTypeAttribute {
    FirstSpace = 'first-space',
    NotFirstSpace = 'not-first-space',
    NewLine = 'new-line',
    LeftText = 'left-text',
    RightText = 'right-text',
    SingleChar = 'single-char',
}

interface IChildNode extends ChildNode {
    getAttribute(attribute: string): string | null;
}

interface IEditorMergeTags {
    tag: string;
    label: string;
    required?: boolean;
}

enum MatchType {
    Word,
    MergeTag,
    Space,
    NewLine,
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
            return textToTags(text, tags);
        },
        [requiredTags]
    );

    const editorContentToTags = async (
        editor: HTMLDivElement,
        availableMergeTags: { tag: string; label: string; required?: boolean }[],
        convertToPlainTextBeforeHand = false
    ) => {
        let textToConvert;

        if (convertToPlainTextBeforeHand) {
            textToConvert = transformToPlainText(editor);
        } else {
            textToConvert = editor.innerHTML;
        }

        return await textToTags(textToConvert, availableMergeTags);
    };

    // TODO change the whole logic, to create tags and insert tags instead of text concatination
    const textToTags = useCallback(
        async (
            text: string,
            availableMergeTags: { tag: string; label: string; required?: boolean }[]
        ) => {
            let textsConverted = '';
            let mergeTagsInfo: IMergeTagInfo[] = [];
            let lastMatch: MatchType | undefined;
            let i = 0;

            while (i < text.length) {
                const char = text[i];

                // TODO cleanup checks below
                if (char === '{' && text[i + 1] === '{' && checkIfItIsMergeTag(text, i, availableMergeTags)) {
                    let mergeTag = checkIfItIsMergeTag(text, i, availableMergeTags);

                    if (mergeTag) {
                        mergeTagsInfo.push({
                            insertIndex: textsConverted.length,
                            tagToReplace: mergeTag,
                        });

                        lastMatch = MatchType.MergeTag;
                        i += mergeTag.length;
                    }
                } else if (matchesSpace(char)) {
                    let typeAttribute =
                        lastMatch !== MatchType.Space
                            ? TextTypeAttribute.FirstSpace
                            : TextTypeAttribute.NotFirstSpace;
                    textsConverted += textNodeHtmlString(typeAttribute, char);
                    i++;
                    lastMatch = MatchType.Space;
                } else if (matchesNewLine(char)) {
                    textsConverted += textNodeHtmlString(TextTypeAttribute.NewLine, char);
                    i++;
                    lastMatch = MatchType.NewLine;
                } else {
                    const word = findMatchWord(text, i, availableMergeTags);
                    const spanTags = wordToSpanTags(word);

                    textsConverted += spanTags;
                    i += word.length;
                    lastMatch = MatchType.Word;
                }
            }

            return await processMergeTags(textsConverted, mergeTagsInfo, availableMergeTags);
        },
        []
    );

    return {
        editorContentToTags,
        textToTags,
        transformToPlainText,
        validateRemovableTags,
        generateRemovedRequiredTags,
    };
};

const processMergeTags = async (
    text: string,
    mergeTagsInfo: IMergeTagInfo[],
    availableMergeTags: { tag: string; label: string; required?: boolean }[]
) => {
    // to start replacing from right to left, not to change the index
    const mergeTagsUsed = mergeTagsInfo.map(item => item.tagToReplace);
    const mergeTagsNotMapped = mergeTagsUsed.filter(item => !mergeTagToHtml.has(item));

    if (mergeTagsNotMapped.length) {
        await Promise.all(
            mergeTagsNotMapped.map(
                item =>
                    new Promise(resolve => {
                        // TODO need to get rid of, to avoid n2 complexity
                        const mergeTag = availableMergeTags.find(mtag => mtag.tag === item)!;
                        const myDiv = document.createElement('div');

                        try {
                            ReactDOM.render(<MergeTag mergeTag={mergeTag} />, myDiv, () => {
                                mergeTagToHtml.set(item, myDiv.innerHTML);
                                myDiv.remove();
                                resolve(true);
                            });
                        } catch (e) {
                            console.warn(e);
                            mergeTagToHtml.set(item, '');
                            resolve(true);
                        }
                    })
            )
        );
    }

    // to start inserting from right to left, not to change the insertion index while inserting the tag
    const mergeTagsInfoReversed = mergeTagsInfo.reverse();

    let textToReturn = text;
    mergeTagsInfoReversed.forEach(item => {
        const { insertIndex, tagToReplace } = item;
        textToReturn =
            textToReturn.substring(0, insertIndex) +
            mergeTagToHtml.get(tagToReplace) +
            textToReturn.substring(insertIndex);
    });

    return textToReturn;
};

const checkIfItIsMergeTag = (
    text: string,
    startIndex: number,
    mergeTags: { tag: string; label: string; required?: boolean }[]
) => {
    for (let i = 0; i < mergeTags.length; i++) {
        const subStringStartingFromIndex = text.substring(startIndex);

        if (subStringStartingFromIndex.startsWith(mergeTags[i].tag)) {
            return mergeTags[i].tag;
        }
    }
    return false;
};

const matchesSpace = (char: String) => char.match(/[\t\s]/);
const matchesNewLine = (char: String) => char.match(/\n/);
const matchesWhiteSpace = (char: String) => char.match(/[\n\t\s]/);

export const isTextElement = (element: HTMLElement) => {
    const textAttribute = element.getAttribute('data-text-type');
    return (
        textAttribute === TextTypeAttribute.FirstSpace ||
        textAttribute === TextTypeAttribute.NotFirstSpace
    );
};

const findMatchWord = (
    text: string,
    i: number,
    mergeTags: { tag: string; label: string; required?: boolean }[]
) => {
    let word = '';
    for (let j = i; j < text.length; j++) {
        // if between the word and merge tag there is no space
        if (text[j] === '{' && text[j + 1] === '{' && checkIfItIsMergeTag(text, j, mergeTags)) {
            return word;
        } else if (matchesWhiteSpace(text[j])) {
            return word;
        } else {
            word += text[j];
        }
    }
    return word;
};

const wordToSpanTags = (word: string) => {
    const centerIndex = Math.ceil(word.length / 2);
    const leftText = word.slice(0, centerIndex);
    const rightText = word.slice(centerIndex, word.length);

    let leftSpanTypeAttribute =
        rightText !== undefined ? TextTypeAttribute.LeftText : TextTypeAttribute.SingleChar;
    let tagsString = textNodeHtmlString(leftSpanTypeAttribute, leftText);

    if (rightText) {
        tagsString += textNodeHtmlString(TextTypeAttribute.RightText, rightText);
    }

    return tagsString;
};

const textNodeHtmlString = (textType: TextTypeAttribute, content: string) =>
    `<span data-node-type=${ContentNodeType.Text} data-text-type=${textType}>${content}</span>`;
