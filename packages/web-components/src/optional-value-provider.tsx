import { SymbolToken, interfaces, Provider } from '@servicetitan/react-ioc';

export interface OptionalValueProviderProps<T> {
    provide: SymbolToken<T> | interfaces.Abstract<T>;
    useValue: T | undefined;
    children: JSX.Element;
}

export const OptionalValueProvider = <T extends any>({
    provide,
    useValue,
    children,
}: OptionalValueProviderProps<T>) => {
    if (useValue) {
        return <Provider singletons={[{ provide, useValue }]}>{children}</Provider>;
    }

    return children;
};
