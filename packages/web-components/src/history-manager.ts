import { History, Location, UnregisterCallback } from 'history';

import { injectable } from '@servicetitan/react-ioc';

@injectable()
export class HistoryManager {
    // Initiator of action, used for filtering redirections
    occupied?: { history: History; location: Location };

    storage = new Map<History, UnregisterCallback>();

    register = (addable: History) => {
        this.storage.set(
            addable,
            addable.listen(location => {
                const path = addable.createHref(location);
                const state = location.state;

                if (!this.occupied) {
                    this.occupied = { history: addable, location };
                } else if (this.occupied.history === addable) {
                    this.occupied.location = location;
                }

                for (const history of this.storage.keys()) {
                    if (history === addable) {
                        continue;
                    }

                    if (
                        history.createHref(history.location) === path &&
                        history.location.state === state
                    ) {
                        continue;
                    }

                    // Allow redirects only to the deeper pages
                    const unblock = history.block(location => {
                        if (
                            this.occupied &&
                            !history
                                .createHref(location)
                                .startsWith(
                                    this.occupied.history.createHref(this.occupied.location)
                                )
                        ) {
                            return false;
                        }
                    });

                    history.replace(path, state);

                    unblock();
                }

                // Wait for all updates, including redirections
                setTimeout(() => {
                    if (
                        this.occupied?.history === addable &&
                        this.occupied?.location === location
                    ) {
                        this.occupied = undefined;
                    }
                });
            })
        );
    };

    unregister = (removable: History) => {
        if (this.storage.has(removable)) {
            this.storage.get(removable)!();
            this.storage.delete(removable);
        }
    };
}
