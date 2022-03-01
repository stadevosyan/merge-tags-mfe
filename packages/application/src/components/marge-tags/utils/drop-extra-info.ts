import {
    ContentNodeType,
    TextTypeAttribute,
} from '../use-merge-tag-editor-helpers/use-merge-tag-editor-helpers';

export const dropExtraInfo = (element: HTMLElement) => {
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
