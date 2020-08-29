// credit: ls-joris-desmedt https://gist.github.com/ls-joris-desmedt/29d297250f84338e82a89458fb30b447

import React from 'react';
import { FederatedProvider } from './FederatedProvider';
import { scopes } from './config';

// This is an example app on how you would setup your Nextjs app

const App = ({ Component }) => {
  return (
    <FederatedProvider scopes={scopes}>
      <Component />
    </FederatedProvider>
  );
};

export default App;
