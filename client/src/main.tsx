import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { assetUrl } from './lib/assetUrl';
import './index.css';

document.documentElement.style.setProperty(
  '--asset-page-bg',
  `url("${assetUrl('/skills/lines.png')}")`,
);
document.documentElement.style.setProperty(
  '--asset-locked-icon',
  `url("${assetUrl('/icons/dont.webp')}")`,
);
document.documentElement.style.setProperty(
  '--asset-blueprint-icon',
  `url("${assetUrl('/main/survivor.webp')}")`,
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
