// credit: ls-joris-desmedt https://gist.github.com/ls-joris-desmedt/29d297250f84338e82a89458fb30b447

import { initiateRemote, initiateScope } from './utils';

// This is an example of how a scope configuration would look like
// You can here define all the remote scopes your application needs
// These will lazily initiated and only when needed
// With this you can define a different set of shared libs for each scope

export interface RemoteScope {
  remote: string;
  initiate: (scope: any, scopeName: string, remote: string) => Promise<void>;
}

export interface RemoteMap {
  [key: string]: RemoteScope;
}

const peerScope = {
  remote: 'http://localhost:8080/remoteEntry.js',
  initiate: async (scope: any, scopeName: string, remote: string) => {
    await initiateRemote(remote);
    initiateScope(scope, scopeName, () => ({
      react: {
        get: () => Promise.resolve(() => require('react')),
        loaded: true,
      },
      'emotion-theming': {
        get: () => Promise.resolve(() => require('emotion-theming')),
        loaded: true,
      },
      '@emotion/core': {
        get: () => Promise.resolve(() => require('@emotion/core')),
        loaded: true,
      },
      '@emotion/styled': {
        get: () => Promise.resolve(() => require('@emotion/styled')),
        loaded: true,
      },
    }));
  },
};

export const scopes: RemoteMap = { peer: peerScope };
