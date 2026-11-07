import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Admin from './Admin.jsx';
import './styles.css';
import './login.css';
import './polish.css';
import './app.css';
import './bold.css';

// /admin is a completely separate app with its own login. Customers never see links to it.
const isAdmin = window.location.pathname.replace(/\/+$/, '').toLowerCase() === '/admin';
createRoot(document.getElementById('root')).render(<React.StrictMode>{isAdmin ? <Admin /> : <App />}</React.StrictMode>);
