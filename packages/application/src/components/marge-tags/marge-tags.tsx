// @ts-nocheck
import { Stack, TagGroup } from '@servicetitan/design-system';
import React, { Fragment } from 'react';
import { MergeTagEditor } from './merge-tags-control/merge-tag-editor';
import { MergeTag } from './merge-tags-control/merge-tag';
import { MergeTagEditor_Old } from './merge-tags-control-old/merge-tag-editor-old';

const mergeTags = [
    {
        label: 'Customer First Name',
        tag: '{{customer_first_name}}',
        value: 'Tracy',
        textFormattingType: 1,
        tagType: 1,
        required: false,
    },
    {
        label: 'Technician Full Name',
        tag: '{{technician_name}}',
        value: 'Charles Brown',
        textFormattingType: 1,
        tagType: 1,
        required: false,
    },
    {
        label: 'Company Name',
        tag: '{{company_name}}',
        value: 'Good Company, Inc',
        textFormattingType: 1,
        tagType: 1,
        required: false,
    },
    {
        label: 'Location',
        tag: '{{location}}',
        value: 'Good Plumbing, Glendale',
        textFormattingType: 1,
        tagType: 1,
        required: false,
    },
    {
        label: 'Job Type',
        tag: '{{job_type}}',
        value: 'Clogged Drain',
        textFormattingType: 1,
        tagType: 1,
        required: false,
    },
    {
        label: 'Job Complete Date',
        tag: '{{job_complete_date}}',
        value: '02/15/22',
        textFormattingType: 1,
        tagType: 1,
        required: false,
    },
    {
        label: 'Listing Link',
        tag: '{{listing_link}}',
        value: 'Social account links',
        textFormattingType: 2,
        tagType: 2,
        maxUseCount: 1,
        required: true,
    },
];

const body =
    'Hi {{customer_first_name}}, we’d like to know how did {{technician_name}} do in completing your request?\n{{listing_link}} ';
// const body = 'Hi {{customer_first_name}} abs ef';
// const body = 'h abcdef k \n{{listing_link}}';

export function MergeTags() {
    const onChangeHandler = (e, data) => {
        console.log({ data });
    };

    const blurHandler = e => {
        console.log('e: ', e);
    };

    const tagClickHandler = e => {
        console.log('e: ', e);
    };

    return (
        <Fragment>
            <MergeTagEditor
                value={body}
                onChange={onChangeHandler}
                onBlur={blurHandler}
                error={''}
                thin={true}
                hasFooter={false}
                mergeTags={mergeTags}
            />
            <Stack spacing={1} style={{ border: '1px', margin: 5, padding: 5 }}>
                <TagGroup>
                    {mergeTags.map(mergeTag => (
                        <MergeTag
                            disabled={false}
                            key={mergeTag.tag}
                            mergeTag={mergeTag}
                            clickHandler={tagClickHandler}
                        />
                    ))}
                </TagGroup>
            </Stack>
        </Fragment>
    );
}
