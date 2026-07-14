/**
 * Application entry point.
 * Vite loads this file first; it mounts the React tree and global styles.
 * PWA service-worker registration is handled by vite-plugin-pwa in production builds.
 */
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(<App />);
  