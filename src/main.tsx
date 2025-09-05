import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './providers/ThemeProvider'

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="system" storageKey="beree-theme">
    <App />
  </ThemeProvider>
);
