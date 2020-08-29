import * as React from 'react';
import serialize from 'serialize-javascript';
import { isJS } from './guards';
import { DocumentProps, CharmContext, DocumentGetInitialProps } from './types';

export const __CharmContext = React.createContext({} as CharmContext);

export class Document extends React.Component<DocumentProps> {
  static getInitialProps = async ({ renderPage }: DocumentGetInitialProps) => {
    const page = await renderPage();
    return { ...page };
  };

  render() {
    const { helmet } = this.props;
    // get attributes from React Helmet
    const htmlAttrs = helmet.htmlAttributes.toComponent();
    const bodyAttrs = helmet.bodyAttributes.toComponent();

    return (
      <html {...htmlAttrs}>
        <head>
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta charSet="utf-8" />
          <title>Charm</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          {helmet.title.toComponent()}
          {helmet.meta.toComponent()}
          {helmet.link.toComponent()}
          <CharmStyles />
        </head>
        <body {...bodyAttrs}>
          <p>
            any of a number of subatomic particles carrying a fractional
            electric charge, postulated as building blocks of the hadrons.
            Charms have not been directly observed but theoretical predictions
            based on their existence have been confirmed experimentally.
          </p>
          <CharmRoot />
          <CharmData />
          <CharmScripts />
        </body>
      </html>
    );
  }
}

export const useCharmContext = () => {
  return React.useContext(__CharmContext);
};

export const CharmRoot: React.FC = () => {
  const { html } = useCharmContext();
  return <div id="root" dangerouslySetInnerHTML={{ __html: html }} />;
};

export const CharmData: React.FC<{ data?: object }> = ({ data }) => {
  const { data: contextData } = useCharmContext();
  return (
    <script
      defer
      dangerouslySetInnerHTML={{
        __html: `window.__SERVER_APP_STATE__ =  ${serialize({
          ...(data || contextData),
        })}`,
      }}
    />
  );
};

export const CharmStyles: React.FC = () => {
  const { assets, styles } = useCharmContext();
  return (
    <>
      {assets.client.css && <link rel="stylesheet" href={assets.client.css} />}
      {styles.map((path) => (
        <link key={path} rel="stylesheet" href={path} />
      ))}
    </>
  );
};

export const CharmScripts: React.FC = () => {
  const { scripts, assets } = useCharmContext();
  return (
    <>
      {scripts.filter(isJS).map((path) => (
        <script
          key={path}
          defer
          type="text/javascript"
          src={path}
          crossOrigin="anonymous"
        />
      ))}
      {assets.client.js && (
        <script
          type="text/javascript"
          src={assets.client.js}
          defer
          crossOrigin="anonymous"
        />
      )}
    </>
  );
};
