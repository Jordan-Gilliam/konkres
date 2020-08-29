import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';
// import { HeadManagerContext } from './head-manager-context'
// import { defaultHead } from './Head'
import { Helmet } from 'react-helmet';
import { matchPath, StaticRouter, RouteProps } from 'react-router-dom';
import { Document as DefaultDoc, __CharmContext } from './Document';
import { Charm } from './Charm';
import { loadInitialProps } from './loadInitialProps';
import * as guards from './guards';
import * as url from 'url';
import { Request, Response } from 'express';
import { Assets, AsyncRouteProps, Chunks, CharmClientData } from './types';
import { StaticRouterContext } from 'react-router';
import { getAssets } from './getAssets';

const modPageFn = function <Props>(Page: React.ComponentType<Props>) {
  return function RenderCharm(props: Props) {
    return <Page {...props} />;
  };
};

/*
  The customRenderer parameter is a (potentially async) function that can be set to return 
  more than just a rendered string.
  If present, it will be used instead of the default ReactDOMServer renderToString function.
  It has to return an object of shape { html, ... }, in which html will be used as the rendered string
  Other props will be also pass to the Document component
*/

export interface CharmRenderOptions<T> {
  req: Request;
  res: Response;
  assets: Assets;
  routes: AsyncRouteProps[];
  document?: typeof DefaultDoc;
  chunks: Chunks;
  scrollToTop?: boolean;
  customRenderer?: (
    element: React.ReactElement<T>
  ) => { html: string } | Promise<{ html: string }>;
}

export async function render<T>(options: CharmRenderOptions<T>) {
  const {
    req,
    res,
    routes: pureRoutes,
    assets,
    document: Document,
    customRenderer,
    chunks,
    scrollToTop = true,
    ...rest
  } = options;
  const Doc = Document || DefaultDoc;

  const routes = guards.getAllRoutes(pureRoutes);

  const context: StaticRouterContext = {};

  const autoScrollRef = { current: scrollToTop };
  const { match, data: initialData } = await loadInitialProps(
    routes,
    url.parse(req.url).pathname as string,
    {
      req,
      res,
      scrollToTop: autoScrollRef,
      ...rest,
    }
  );

  if (initialData) {
    const { redirectTo, statusCode } = initialData as {
      statusCode?: number;
      redirectTo?: string;
    };

    if (statusCode) {
      context.statusCode = statusCode;
    }

    if (redirectTo) {
      res.redirect(statusCode || 302, redirectTo);
      return;
    }
  }

  if (match && match.redirectTo && match.path) {
    res.redirect(301, req.originalUrl.replace(match.path, match.redirectTo));
    return;
  }

  const reactRouterMatch = matchPath(req.url, match as RouteProps);

  const { scripts, styles } = getAssets({ route: match, chunks });
  const quarkData: CharmClientData = {
    scrollToTop: autoScrollRef,
  };

  const data = {
    initialData,
    quarkData,
  };

  const renderPage = async (fn = modPageFn) => {
    // By default, we keep ReactDOMServer synchronous renderToString function
    const defaultRenderer = (element: React.ReactElement<T>) => ({
      html: ReactDOMServer.renderToString(element),
    });
    const renderer = customRenderer || defaultRenderer;
    const asyncOrSyncRender = renderer(
      <StaticRouter location={req.url} context={context}>
        {fn(Charm)({ routes, data, transitionBehavior: 'blocking' })}
      </StaticRouter>
    );

    const renderedContent = await asyncOrSyncRender;
    const helmet = Helmet.renderStatic();

    const { statusCode, url: redirectTo } = context;

    if (redirectTo) {
      res.redirect(statusCode || 302, redirectTo);
    }

    if (statusCode) {
      res.status(statusCode);
    }

    return { helmet, ...renderedContent };
  };

  const { html, ...docProps } = await Doc.getInitialProps({
    req,
    res,
    assets,
    renderPage,
    data,
    helmet: Helmet.renderStatic(),
    match: reactRouterMatch,
    scripts,
    styles,
    scrollToTop: autoScrollRef,
    ...rest,
  });

  const props = {
    assets,
    data,
    scripts,
    styles,
    match: reactRouterMatch,
    ...rest,
    ...docProps,
    html,
  };

  const doc = ReactDOMServer.renderToStaticMarkup(
    <__CharmContext.Provider value={props}>
      <Doc {...props} />
    </__CharmContext.Provider>
  );
  return `<!doctype html>${doc}`;
}
