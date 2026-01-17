import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./components/ThemeProvider";
import App from "./App.tsx";
import "./index.css";
import { enableDevtoolsProtection } from "./lib/security";

// Enable devtools protection BEFORE app renders for maximum security
const cleanupDevtools = enableDevtoolsProtection();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  cleanupDevtools();
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <App />
  </ThemeProvider>
);
