import React from 'react';
import {createRoot} from 'react-dom/client';

import {App} from './App';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
    throw new Error('Cannot start virt lab without a root element');
}

createRoot(root).render(<App/>);
