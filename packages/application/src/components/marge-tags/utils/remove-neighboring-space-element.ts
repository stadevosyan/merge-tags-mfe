import { isTextElement } from '../use-merge-tag-editor-helpers/use-merge-tag-editor-helpers';

export const removeNeighboringSpaceElement = (node: HTMLElement) => {
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
