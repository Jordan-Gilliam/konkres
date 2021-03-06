import * as React from 'react';
import {
  Switch,
  Route,
  withRouter,
  Redirect,
  match as Match,
  RouteComponentProps,
} from 'react-router-dom';
import { loadInitialProps } from './loadInitialProps';
import { History, Location } from 'history';
import {
  AsyncRouteProps,
  ServerAppState,
  InitialData,
  TransitionBehavior,
} from './types';
import { get404Component, getAllRoutes } from './utils';

export interface QuarkpartyProps extends RouteComponentProps<any> {
  history: History;
  location: Location;
  data: ServerAppState;
  routes: AsyncRouteProps[];
  match: Match<any>;
  transitionBehavior: TransitionBehavior;
}

export interface QuarkpartyState {
  data?: InitialData;
  previousLocation: Location | null;
  currentLocation: Location | null;
}

class Quarkparty extends React.Component<QuarkpartyProps, QuarkpartyState> {
  state = {
    data: this.props.data.initialData,
    previousLocation: null,
    currentLocation: this.props.location,
  };

  prefetcherCache: object = {};
  NotfoundComponent:
    | React.ComponentType<RouteComponentProps<any>>
    | React.ComponentType<any> = get404Component(this.props.routes);

  static defaultProps = {
    transitionBehavior: 'blocking' as TransitionBehavior,
  };

  static getDerivedStateFromProps(
    props: QuarkpartyProps,
    state: QuarkpartyState
  ) {
    const currentLocation = props.location;
    const previousLocation = state.currentLocation;

    const navigated = currentLocation !== previousLocation;
    if (navigated) {
      return {
        previousLocation: state.previousLocation || previousLocation,
        currentLocation,
      };
    }

    return null;
  }

  componentDidUpdate(_prevProps: QuarkpartyProps, prevState: QuarkpartyState) {
    const navigated = prevState.currentLocation !== this.state.currentLocation;
    if (navigated) {
      const {
        location,
        history,
        routes,
        data,
        // we don't want to pass these
        // to loadInitialProps()
        match,
        staticContext,
        children,
        ...rest
      } = this.props;

      const { scrollToTop } = data.quarkData;

      loadInitialProps(routes, location.pathname, {
        location,
        history,
        scrollToTop,
        ...rest,
      })
        .then(({ data }) => {
          if (this.state.currentLocation !== location) return;

          // Only for page changes, prevent scroll up for anchor links
          if (
            (prevState.previousLocation &&
              prevState.previousLocation.pathname) !== location.pathname &&
            // Only Scroll if scrollToTop is not false
            this.props.data.quarkData.scrollToTop.current
          ) {
            window.scrollTo(0, 0);
          }
          this.setState({ previousLocation: null, data });
        })
        .catch((e) => {
          // @todo we should more cleverly handle errors???
          console.log(e);
        });
    }
  }

  prefetch = (pathname: string) => {
    loadInitialProps(this.props.routes, pathname, {
      history: this.props.history,
    })
      .then(({ data }) => {
        this.prefetcherCache = {
          ...this.prefetcherCache,
          [pathname]: data,
        };
      })
      .catch((e) => console.log(e));
  };

  render() {
    const { previousLocation, data } = this.state;
    const { location: currentLocation, transitionBehavior } = this.props;
    const initialData = this.prefetcherCache[currentLocation.pathname] || data;

    const location =
      transitionBehavior === 'instant'
        ? currentLocation
        : previousLocation || currentLocation;

    return (
      <Switch location={location}>
        {initialData &&
          initialData.statusCode &&
          initialData.statusCode === 404 && (
            <Route
              component={this.NotfoundComponent}
              path={location.pathname}
            />
          )}
        {initialData && initialData.redirectTo && initialData.redirectTo && (
          <Redirect to={initialData.redirectTo} />
        )}
        {getAllRoutes(this.props.routes).map((r, i) => (
          <Route
            key={`route--${i}`}
            path={r.path}
            exact={r.exact}
            render={(props) =>
              React.createElement(r.component, {
                ...initialData,
                history: props.history,
                match: props.match,
                prefetch: this.prefetch,
                location,
              })
            }
          />
        ))}
      </Switch>
    );
  }
}
export const Quark = withRouter(Quarkparty);
