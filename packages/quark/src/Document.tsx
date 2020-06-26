import * as React from 'react';
import serialize from 'serialize-javascript';
import { isJS } from './utils';
import { DocumentProps, QuarkContext, DocumentGetInitialProps } from './types';

export const __QuarkContext = React.createContext({} as QuarkContext);

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
          <title>Welcome to the Quarkparty</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          {helmet.title.toComponent()}
          {helmet.meta.toComponent()}
          {helmet.link.toComponent()}
          <QuarkStyles />
        </head>
        <body {...bodyAttrs}>
          <QuarkRoot />
          <QuarkData />
          <QuarkScripts />
        </body>
      </html>
    );
  }
}

export const useQuarkContext = () => {
  return React.useContext(__QuarkContext);
};

export const QuarkRoot: React.FC = () => {
  const { html } = useQuarkContext();
  return <div id="root" dangerouslySetInnerHTML={{ __html: html }} />;
};

export const QuarkData: React.FC<{ data?: object }> = ({ data }) => {
  const { data: contextData } = useQuarkContext();
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

export const QuarkStyles: React.FC = () => {
  const { assets, styles } = useQuarkContext();
  return (
    <>
      {assets.client.css && <link rel="stylesheet" href={assets.client.css} />}
      {styles.map((path) => (
        <link key={path} rel="stylesheet" href={path} />
      ))}
    </>
  );
};

export const QuarkScripts: React.FC = () => {
  const { scripts, assets } = useQuarkContext();
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
