// @ts-nocheck
import React, { StrictMode, Fragment, FC } from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { SideNav, Frame, Page, Sidebar } from '@servicetitan/design-system';
import { SideNavLinkItem } from '@servicetitan/link-item';
import { MergeTags } from './components/marge-tags/marge-tags';

import './app.css';

export const App: FC = () => { 

    return (
        <StrictMode>
            <BrowserRouter>
                <Frame>
                    <Page
                        sidebar={
                            <Sidebar localStorageKey="sidebar-application">
                                <Sidebar.Section padding="y">
                                    <SideNav title="Application">
                                        <SideNavLinkItem pathname="/" exact>
                                            Main page
                                        </SideNavLinkItem>
                                        <SideNavLinkItem pathname="/second-page">
                                            Second page
                                        </SideNavLinkItem>
                                    </SideNav>
                                </Sidebar.Section>
                            </Sidebar>
                        }
                        maxWidth="wide"
                    >
                        <Switch>
                            <Route
                                path="/"
                                exact
                                component={MergeTags}
                            />
                            <Route
                                path="/second-page"
                                component={() => <Fragment>Second page</Fragment>}
                            />
                        </Switch>
                    </Page>
                </Frame>
            </BrowserRouter>
        </StrictMode>
)};
