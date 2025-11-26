import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // Assuming you have a basic CSS file
import App from './App';

// Find the target DOM element
const container = document.getElementById('root');

// CRITICAL: Ensure the container exists before attempting to create the root
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    // Log an error if the root container is not found, though the browser already does this
    console.error("Failed to find the root element in index.html to mount the React app.");
}