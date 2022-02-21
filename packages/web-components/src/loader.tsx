import {
    lazy,
    Suspense,
    useEffect,
    useMemo,
    useState,
    forwardRef,
    useImperativeHandle,
    ReactElement,
    ReactNode,
} from 'react';

import semver from 'semver';

import get from 'lodash.get';

import { ErrorBoundary } from '@servicetitan/error-boundary';
import { Log } from '@servicetitan/log-service';
import { useOptionalDependencies } from '@servicetitan/react-ioc';

import {
    useCancelation,
    EventBus,
    useEventBus,
    getJson,
    isCompatible,
    IWebComponent,
} from './common';
import { HistoryManager } from './history-manager';

declare global {
    export const EXPOSED_DEPENDENCIES: Record<string, { version: string; variable: string }>;
}

type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

function omitPackageVersion(packageUrl: string) {
    const chunks = packageUrl.split('@');

    if (chunks.length > 2) {
        return chunks.slice(0, -1).join('@');
    }

    return packageUrl;
}

async function getBundleInfo(packageUrl: string, signal?: AbortSignal) {
    const {
        data: { dependencies, version },
        headers,
    } = await getJson(`${packageUrl}/package.json`, { cache: 'no-store', signal });

    const exactPackageUrl =
        headers.get('X-Delivered-By') === 'unpkg'
            ? `${omitPackageVersion(packageUrl)}@${version}`
            : packageUrl;

    const { data: metadata } = await getJson(`${exactPackageUrl}/dist/metadata.json`, { signal });

    const mismatch = Object.entries(EXPOSED_DEPENDENCIES).reduce(
        (result, [dependency, { version: hostVersion }]) => {
            const packageVersion = dependencies[dependency];

            if (packageVersion && !isCompatible(hostVersion, packageVersion)) {
                result[dependency] = { host: hostVersion, package: packageVersion };
            }

            return result;
        },
        {} as Record<string, { host: string; package: string }>
    );

    for (const [dependency, variable] of Object.entries(metadata.sharedDependencies)) {
        const packageVersion = dependencies[dependency];

        if (!EXPOSED_DEPENDENCIES[dependency]) {
            mismatch[dependency] = { host: 'missing', package: packageVersion };
        } else if (EXPOSED_DEPENDENCIES[dependency].variable !== variable) {
            mismatch[dependency] = { host: 'wrong global variable', package: packageVersion };
        }
    }

    const hasMismatch = !!Object.keys(mismatch).length;
    const startupVersion = metadata.bundledWith?.['@servicetitan/startup'];
    const supportLightBundles = startupVersion && semver.gte(startupVersion, '17.0.0');
    const embed = !hasMismatch && supportLightBundles;
    return {
        url: `${exactPackageUrl}/dist/bundle/${embed ? 'light' : 'full'}/index.js`,
        WebComponent: metadata.name,
        disposer: () => {
            if (embed) {
                const path = Object.values<string>(metadata.sharedDependencies).shift();
                if (path) {
                    get(window, path).getStorage().clear(metadata.name);
                }
            }
        },
        mismatch: hasMismatch ? mismatch : undefined,
    };
}

export type LoaderRef = EventBus;

export interface LoaderProps {
    src: string;
    data?: Record<string, string>;
    basename?: string;
    loadingFallback?: NonNullable<ReactNode> | null;
    errorFallback?: NonNullable<ReactNode> | null;
    className?: string;
}

export const Loader = forwardRef<LoaderRef, LoaderProps>(
    ({ src, data = {}, basename, loadingFallback, errorFallback, className }, ref) => {
        const [isLoading, setIsLoading] = useState(true);

        const [logService, historyManager] = useOptionalDependencies(Log, HistoryManager);

        const dataAttrs = useMemo(
            () =>
                Object.fromEntries(
                    Object.entries(data).map(([key, value]) => [
                        'data-' + key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()),
                        value,
                    ])
                ),
            [...Object.entries(data).map(v => v.join())] // eslint-disable-line react-hooks/exhaustive-deps
        );

        const Loader = useMemo(() => {
            const Component = forwardRef<LoaderRef>((_0, ref) => {
                const cancelation = useCancelation();
                const eventBus = useEventBus();

                useImperativeHandle(
                    ref,
                    () => eventBus,
                    [] // eslint-disable-line react-hooks/exhaustive-deps
                );

                useEffect(() => {
                    setIsLoading(true);

                    return () => {
                        cancelation.abort();
                    };
                }, []); // eslint-disable-line react-hooks/exhaustive-deps

                const Lazy = useMemo(
                    () =>
                        lazy<() => JSX.Element | null>(async () => {
                            let bundleInfo: Awaited<ReturnType<typeof getBundleInfo>>;
                            try {
                                bundleInfo = await getBundleInfo(src, cancelation.signal);
                            } catch (e) {
                                if (cancelation.signal.aborted) {
                                    return {
                                        default: () => null,
                                    };
                                }

                                throw e;
                            }

                            const { url, WebComponent, disposer, mismatch } = bundleInfo;

                            if (mismatch) {
                                logService?.warning({
                                    category: 'MicroFrontends.DependenciesMismatch',
                                    message:
                                        'Some of the package dependencies have incompatible versions.',
                                    data: { package: src, dependencies: JSON.stringify(mismatch) },
                                });
                            }

                            const script = Array.from(document.scripts).find(
                                ({ src }) => src === url
                            );
                            if (!script) {
                                await new Promise<void>(resolve => {
                                    const script = document.createElement('script');

                                    script.crossOrigin = 'anonymous';
                                    script.onload = () => {
                                        script.dataset.webComponent = WebComponent;
                                        resolve();
                                    };
                                    script.async = true;
                                    script.src = url;

                                    document.body.append(script);
                                });
                            } else if (!script.dataset.webComponent) {
                                await new Promise<void>(resolve => {
                                    const originalOnload = script.onload;
                                    script.onload = (...args) => {
                                        originalOnload?.call(script, ...args);
                                        resolve();
                                    };
                                });
                            }

                            const handleRef = (webComponent: IWebComponent | null) => {
                                webComponent?.provide({
                                    logService,
                                    historyManager,
                                    eventBus,
                                    basename,
                                    onReady: () => {
                                        setIsLoading(false);
                                    },
                                    onDispose: () => {
                                        disposer();
                                    },
                                });
                            };

                            return {
                                default: () => (
                                    <WebComponent
                                        ref={handleRef}
                                        class={className}
                                        {...dataAttrs}
                                    />
                                ),
                            };
                        }),
                    [] // eslint-disable-line react-hooks/exhaustive-deps
                );

                return <Lazy />;
            });

            return Component;
        }, [src, className, logService, historyManager, basename, dataAttrs]);

        const LoadingFallback = useMemo(
            () => () => {
                if (loadingFallback !== undefined) {
                    return loadingFallback as ReactElement;
                }

                return <h2>Loading...</h2>;
            },
            [loadingFallback]
        );

        const ErrorFallback = useMemo(
            () => () => {
                if (errorFallback !== undefined) {
                    return errorFallback as ReactElement;
                }

                return <h2>Something went wrong</h2>;
            },
            [errorFallback]
        );

        return (
            <ErrorBoundary moduleName={src} fallback={ErrorFallback}>
                {isLoading && <LoadingFallback />}
                <Suspense fallback={null}>
                    <Loader ref={ref} />
                </Suspense>
            </ErrorBoundary>
        );
    }
);
