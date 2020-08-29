// credit: ls-joris-desmedt https://gist.github.com/ls-joris-desmedt/29d297250f84338e82a89458fb30b447

import React from 'react';
import { RemoteComponent } from './RemoteComponent';

// An example of how we would we would use a remote component in a page

const RemoteWrapper = () => {
  return (
    <>
      <RemoteComponent
        scope="peer"
        module="./component1"
        props={{ value: 'foo' }}
      />
      <RemoteComponent scope="peer" module="./component2" props={{}} />
    </>
  );
};

export default RemoteWrapper;
