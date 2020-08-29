import { matchPath, RouteProps } from 'react-router-dom';
import { AsyncRouteProps, InitialProps, CtxBase } from './types';
import { isAsyncComponent } from './guards';

export async function loadInitialProps(
  routes: AsyncRouteProps[],
  pathname: string,
  ctx: CtxBase
): Promise<InitialProps> {
  const promises: Promise<any>[] = [];

  /* 
    matchPath => don't accept undefined path property
    in <Switch> component all Child <Route> components
    have a path prop with value of "/", { path: "/" }
    https://github.com/ReactTraining/react-router/blob/master/packages/react-router/modules/Router.js#L12
    we get around this problem by adding { path: "*" }
    to route that don't have path property
  */

  const matchedComponent = routes.find((route: RouteProps) => {
    const match = matchPath(pathname, { ...route, path: route.path || '*' });

    if (match && route.component && isAsyncComponent(route.component)) {
      const component = route.component;

      promises.push(
        component.load
          ? component
              .load()
              .then(() => component.getInitialProps({ match, ...ctx }))
          : component.getInitialProps({ match, ...ctx })
      );
    }

    return !!match;
  });

  return {
    match: matchedComponent,
    data: (await Promise.all(promises))[0],
  };
}
