import { useLocalStore } from 'mobx-react';
import { action } from 'mobx';

export type OptionalRange = Range | undefined;

export interface MergeTagsTargetStore {
    targetRange: OptionalRange;
    setTargetRange: (range: OptionalRange) => void;
}

export const useMergeTagsTargetStore = () =>
    useLocalStore<MergeTagsTargetStore>(() => ({
        targetRange: undefined,
        setTargetRange: action(function (this: MergeTagsTargetStore, range: OptionalRange) {
            this.targetRange = range;
        }),
    }));
