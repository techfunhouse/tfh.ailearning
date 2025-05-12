import * as React from "react"
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Help debug GitHub Pages deployment
console.log('RefHub App Starting:');
console.log('- Environment mode:', import.meta.env.MODE);
console.log('- GitHub Pages mode:', import.meta.env.VITE_GITHUB_PAGES ? 'Yes' : 'No');
console.log('- Base path:', import.meta.env.VITE_BASE_PATH || 'Default (/)');

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

createRoot(rootElement).render(<App />);
