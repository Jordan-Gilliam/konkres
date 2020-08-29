/*
  credit: ls-joris-desmedt https://gist.github.com/ls-joris-desmedt/29d297250f84338e82a89458fb30b447
  -> utility fns for remotes/scopes/modules init
*/
import * as React from 'react';

/*
  Module Federation Webpack makes an extra trip to server on first render
  -> what I know + take note of what I still need to know
  eg. create promise for remote module @scope unless it's already loaded to html
*/
export const initRemote = (remote: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${remote}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        resolve();
      });
      return;
    }
    const element = document.createElement('script');
    element.src = remote;
    element.type = 'text/javascript';
    element.async = true;

    element.onload = () => {
      console.log(`Dynamic Script Loaded: ${remote}`);
      resolve();
    };

    element.onerror = () => {
      console.error(`Dynamic Script Error: ${remote}`);
      reject();
    };

    document.head.appendChild(element);
  });
};

export const initScope = (
  scopeObject: any,
  scopeName: string,
  sharedLibs: () => any
) => {
  if (scopeObject[scopeName] && scopeObject[scopeName].init) {
    try {
      scopeObject[scopeName].init(
        Object.assign(
          sharedLibs(),
          // eslint-disable-next-line
          // @ts-ignore
          scopeObject.__webpack_require__
            ? scopeObject.__webpack_require__.o
            : {}
        )
      );
    } catch (err) {
      // err => due to race conditions that we init the same scope twice => swallow the error
      if (
        err.message !==
        'Container initialization failed as it has already been initialized with a different share scope'
      ) {
        throw err;
      } else {
        console.log('SWALLOWING INIT ERROR');
      }
    }
  } else {
    throw new Error(`Could not find scope ${scopeName}`);
  }
};

export const initComponent = (
  scope: any,
  scopeName: string,
  module: string
) => {
  const component = React.lazy(() =>
    // @ts-ignore
    scope[scopeName].get(module).then((factory) => {
      const Module = factory();
      return Module;
    })
  );
  return component;
};
