import {
  AsyncRouteComponent,
  AsyncRouteComponentType,
  AsyncRouteProps,
  TransitionBehavior,
} from './types';

import { NotFoundComponent } from './NotFoundComponent';

/**
    * @private Guard clause --------------------------------------
      -> is the given object => Function
  */
export const isFunction = (obj: any) => 'function' === typeof obj;

/**
    * @private Guard clause --------------------------------------------------
      -> ensure given object => Object
  */
export const isObject = (obj: any) => obj !== null && typeof obj === 'object';

/**
    * @private Guard clause ---------------------
      -> ensure given object/value => Promise
  */
export const isPromise = (value: any): boolean =>
  isObject(value) && isFunction(value.then);

/**
    * @private Guard clause ----------------------------------------
      -> ensure DOM presence => client
  */
export const isDOM = (): boolean =>
  typeof window === 'object' && typeof window.document === 'object';

/**
    * @private Guard clause --------------------
      -> ensure no DOM presence => server
  */
export const isServer = (): boolean => !isDOM();

/** 
    * @private Guard clause -------------------------------------------------
      -> ensure AsyncRouteComponent union type on getInitialProps 
  */
export function isAsyncComponent(
  Component: AsyncRouteComponent
): Component is AsyncRouteComponentType<any> {
  return (
    (Component as AsyncRouteComponentType<any>).getInitialProps !== undefined
  );
}

// TODO: add guard for chunkHash?
/** 
    * @private Guard clause --------------------------------------------
      -> ensure AsyncRouteComponent union type on load
  */
export function isLoadableComponent(
  Component: AsyncRouteComponent
): Component is AsyncRouteComponentType<any> {
  return (Component as AsyncRouteComponentType<any>).load !== undefined;
}

/** 
    * @private Guard clause --------------------------------------------------
      -> ensure 404 is given routes array have a 404 page?  
  */
export function is404ComponentAvailable(
  routes: AsyncRouteProps<any>[]
): AsyncRouteProps<any> | false {
  return (
    routes.find((route) => ['**', '*', '', undefined].includes(route.path)) ||
    false
  );
}

/**
    * @private Guard clause -------------------------
      -> ensure user provided 404 
      -> get 404Component => if !404Component => default 404Component
  */
export function get404Component(
  routes: AsyncRouteProps<any>[]
): AsyncRouteComponent<any> {
  const match = is404ComponentAvailable(routes);
  return match ? match.component : NotFoundComponent;
}

/**
    * @private Guard clause -------------------------
      -> ensure fetched route exists
      -> get 404Component => if !404Component => default NotFoundComponent
  */
export function getAllRoutes(
  routes: AsyncRouteProps<any>[]
): AsyncRouteProps<any>[] {
  return is404ComponentAvailable(routes)
    ? routes
    : [...routes, { component: NotFoundComponent }];
}

/**
    * @private Guard clause ---------
      -> ensure module is javascript
  */
export function isJS(str: string) {
  return str.endsWith('.js');
}

/**
    * @private Guard clause -----------------------------------------
      -> ensure given transition type is instant 
  */
export function isInstantTransition(transition: TransitionBehavior) {
  return transition === 'instant';
}
