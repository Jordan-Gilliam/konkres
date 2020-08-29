// credit: ls-joris-desmedt https://gist.github.com/ls-joris-desmedt/29d297250f84338e82a89458fb30b447

import * as React from 'react';
import { useFederatedComponent } from './FederatedProvider';

// This is a component to easily consume remote components, just provide the scope name and module name
// Make sure that the scope is defined in the federated provider `scopes` value

const RemoteComponent = ({
  scope,
  module,
  props,
}: {
  scope: string;
  module: string;
  props?: any;
}) => {
  const Component = useFederatedComponent(scope, module);
  const loading = <div>Loading...</div>;

  if (typeof window === 'undefined') {
    return loading;
  }
  return (
    <React.Suspense fallback={loading}>
      <Component {...props} />
    </React.Suspense>
  );
};

export { RemoteComponent };
