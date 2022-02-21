import React from 'react';
import { render } from 'react-dom';

import { App } from './app';

// declare global {
//   interface Window { shadow: any; }
// }

// const appContainer = document.createElement('div');
// document.body.appendChild(appContainer);


// let shadow = appContainer.attachShadow({ mode: 'open'});

// window.shadow = shadow

// console.log('host: ', shadow.host);


const appContainer = document.createElement('div');
document.body.appendChild(appContainer);


// let shadow = appContainer.attachShadow({mode: 'open'});

// console.log(shadow.getSelection());


render(<App />, appContainer);
// // 