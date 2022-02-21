import semver from 'semver';

import mitt from 'mitt';

import { useRef } from 'react';

import { symbolToken } from '@servicetitan/react-ioc';
import { Log } from '@servicetitan/log-service';

import { HistoryManager } from './history-manager';

export const BASENAME_TOKEN = symbolToken<string>('BASENAME_TOKEN');
export const IS_WEB_COMPONENT_TOKEN = symbolToken<boolean>('IS_WEB_COMPONENT_TOKEN');
export const RENDER_ROOT_TOKEN = symbolToken<ShadowRoot>('RENDER_ROOT_TOKEN');

export interface Entries {
    logService?: Log;
    historyManager?: HistoryManager;
    eventBus?: EventBus;
    basename?: string;
    onReady: () => void;
    onDispose: () => void;
}

export interface IWebComponent {
    provide(entries: Entries): void;
}

export function isCompatible(hostVersion: string, packageVersion: string) {
    if (hostVersion === packageVersion) {
        return true;
    }

    if (hostVersion === '*') {
        return false;
    }

    if (packageVersion === '*') {
        return true;
    }

    // host and package have exact non-equal versions
    if (semver.valid(hostVersion) && semver.valid(packageVersion)) {
        return false;
    }

    // exact package version couldn't be compatible with host range
    if (semver.validRange(hostVersion) && semver.valid(packageVersion)) {
        return false;
    }

    // exact host version must be in package range
    if (semver.valid(hostVersion) && semver.validRange(packageVersion)) {
        return semver.satisfies(hostVersion, packageVersion);
    }

    // host range must be fully included in package range
    if (semver.validRange(hostVersion) && semver.validRange(packageVersion)) {
        return semver.subset(hostVersion, packageVersion);
    }

    return false;
}

interface GetJsonOptions extends RequestInit {
    retries?: number;
    retryDelay?: number;
}

export async function getJson<T = any>(
    url: string,
    { retries = 5, retryDelay = 1000, ...config }: GetJsonOptions = {}
): Promise<{ data: T; headers: Headers }> {
    let response: Response;
    try {
        response = await fetch(url, config);
    } catch {
        if (retries > 0) {
            return new Promise((resolve, reject) => {
                const { signal } = config;

                const timeoutId = window.setTimeout(() => {
                    getJson(url, {
                        ...config,
                        retries: retries - 1,
                        retryDelay: retryDelay * 4,
                    }).then(resolve, reject);
                }, retryDelay);

                signal?.addEventListener('abort', () => window.clearTimeout(timeoutId));
            });
        }

        throw new Error(`Failed to fetch: "${url}".`);
    }

    if (!response.ok) {
        let message = `Requesting "${url}" failed with status code ${response.status}.`;

        try {
            message += ` Details: ${await response.text()}.`;
        } catch {} // eslint-disable-line no-empty

        throw new Error(message);
    }

    return { data: await response.json(), headers: response.headers };
}

export function useCancelation() {
    return useRef(new AbortController()).current;
}

export type EventHandler = () => void;

export class EventBus {
    private emitter = mitt();

    on = (type: string, handler: EventHandler) => {
        this.emitter.on(type, handler);
    };

    off = (type: string, handler: EventHandler) => {
        this.emitter.off(type, handler);
    };

    emit = (type: string) => {
        this.emitter.emit(type);
    };
}

export function useEventBus() {
    return useRef(new EventBus()).current;
}
