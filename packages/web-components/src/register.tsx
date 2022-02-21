import { FC, ComponentType } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { Log } from '@servicetitan/log-service';
import { DefaultPortalContext } from '@servicetitan/design-system';
import { Provider } from '@servicetitan/react-ioc';

import { OptionalValueProvider } from './optional-value-provider';
import {
    Entries,
    EventBus,
    IWebComponent,
    BASENAME_TOKEN,
    IS_WEB_COMPONENT_TOKEN,
    RENDER_ROOT_TOKEN,
} from './common';
import { HistoryManager } from './history-manager';

declare global {
    export const WEB_COMPONENT_NAME: string;
}

function createLink(url: string, onLoad: () => void) {
    const element = document.createElement('link');

    element.href = url;
    element.rel = 'stylesheet';
    element.crossOrigin = 'anonymous';
    element.onload = onLoad;
    element.onerror = onLoad;

    return element;
}

const Placeholder: FC = () => <div style={{ display: 'none' }} />;

export function register(Component: ComponentType, light: boolean) {
    const currentDir = (document.currentScript as HTMLScriptElement).src
        .split('/')
        .slice(0, -1)
        .join('/');

    const stylesUrl = `${currentDir}/index.css`;
    const designSystemUrl = light
        ? Array.from(document.getElementsByTagName('link')).find(
              ({ href }) => href && /design-system(\..+)?\.bundle\.css/.test(href)
          )?.href
        : undefined;

    class WebComponent extends HTMLElement implements IWebComponent {
        private root!: ShadowRoot;
        private portal!: ShadowRoot;

        private styles = {
            total: 2 + (designSystemUrl ? 2 : 0),
            loaded: 0,
        };

        private logService?: Log;
        private historyManager?: HistoryManager;
        private eventBus?: EventBus;
        private basename?: string;
        private onReady?: () => void;
        private onDispose?: () => void;

        connectedCallback() {
            console.log('====================================');
            console.log();
            console.log('====================================');
            this.root = this.attachShadow({ mode: 'open' });
            this.portal = document.body
                .appendChild(document.createElement('div'))
                .attachShadow({ mode: 'open' });

            render(<Placeholder />, this.root);

            this.init(this.root);
            this.init(this.portal);
        }

        disconnectedCallback() {
            unmountComponentAtNode(this.root);
            document.body.removeChild(this.portal.host);
            this.onDispose?.();
        }

        provide = (entries: Entries) => {
            for (const [key, value] of Object.entries(entries)) {
                this[key as keyof IWebComponent] = value;
            }

            if (this.styles.loaded === this.styles.total) {
                if (Object.values(entries).some(v => !!v)) {
                    this.render();
                }
            }
        };

        private handleLoad = () => {
            this.styles.loaded++;

            if (this.styles.loaded === this.styles.total) {
                this.render();
            }
        };

        private init = (node: ShadowRoot) => {
            node.appendChild(createLink(stylesUrl, this.handleLoad));

            if (designSystemUrl) {
                node.appendChild(createLink(designSystemUrl, this.handleLoad));
            }
        };

        private render = () => {
            render(
                <Provider
                    singletons={[
                        { provide: IS_WEB_COMPONENT_TOKEN, useValue: true },
                        { provide: RENDER_ROOT_TOKEN, useValue: this.root },
                    ]}
                >
                    <DefaultPortalContext.Provider value={this.portal as unknown as HTMLElement}>
                        <OptionalValueProvider provide={Log} useValue={this.logService}>
                            <OptionalValueProvider
                                provide={HistoryManager}
                                useValue={this.historyManager}
                            >
                                <OptionalValueProvider provide={EventBus} useValue={this.eventBus}>
                                    <OptionalValueProvider
                                        provide={BASENAME_TOKEN}
                                        useValue={this.basename}
                                    >
                                        <Component {...this.dataset} />
                                    </OptionalValueProvider>
                                </OptionalValueProvider>
                            </OptionalValueProvider>
                        </OptionalValueProvider>
                    </DefaultPortalContext.Provider>
                </Provider>,
                this.root,
                this.onReady
            );
        };
    }

    window.customElements.define(WEB_COMPONENT_NAME, WebComponent);
}
