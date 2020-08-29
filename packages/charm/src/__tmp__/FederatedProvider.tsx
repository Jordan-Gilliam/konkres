// credit: ls-joris-desmedt https://gist.github.com/ls-joris-desmedt/29d297250f84338e82a89458fb30b447
import React, {
  createContext,
  ReactNode,
  useState,
  useCallback,
  useContext,
  useEffect,
} from 'react';
import { RemoteMap } from './config';
import { initiateComponent } from './utils';

// This is the federated provider, it keeps some date about which scopes/modules are already initiated/loaded
// This way we don't have to do this twice if we reload an already initiated/loaded scope/module
// It provides a callback function to load the actual module

interface State {
  scopes: { [key: string]: true };
  components: { [key: string]: any };
}

const federatedContext = createContext<
  State & { loadComponent: (scope: string, module: string) => void }
>({ scopes: {}, components: {}, loadComponent: () => {} });

export const FederatedProvider = ({
  children,
  scopes,
}: {
  children: ReactNode;
  scopes: RemoteMap;
}) => {
  const [state, setState] = useState<State>({ scopes: {}, components: {} });

  const loadComponent = useCallback(
    async (scope: string, module: string) => {
      if (!state.scopes[scope]) {
        await scopes[scope].initiate(global, scope, scopes[scope].remote);
        const component = initiateComponent(global, scope, module);
        setState((currentState) => ({
          ...currentState,
          scopes: { ...currentState.scopes, [scope]: true },
          components: {
            ...currentState.components,
            [`${scope}-${module}`]: component,
          },
        }));
      }

      if (!state.components[`${scope}-${module}`]) {
        const component = initiateComponent(global, scope, module);
        setState((currentState) => ({
          ...currentState,
          components: {
            ...currentState.components,
            [`${scope}-${module}`]: component,
          },
        }));
      }
    },
    [state, scopes]
  );
  return (
    <federatedContext.Provider value={{ ...state, loadComponent }}>
      {children}
    </federatedContext.Provider>
  );
};

// This is a hook to use in your component to get the actual module
// It hides all the module federation logic that is happening

export const useFederatedComponent = (scope: string, module: string) => {
  const { components, loadComponent } = useContext(federatedContext);
  const component = components[`${scope}-${module}`];
  useEffect(() => {
    if (!component) {
      loadComponent(scope, module);
    }
  }, [component, scope, module, loadComponent]);

  if (!component) {
    return () => null;
  }

  return component;
};
