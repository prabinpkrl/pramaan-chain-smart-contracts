import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ThemeRegistry from "./components/ThemeRegistry";
import { Web3Provider } from "./components/Web3Provider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Web3Provider>
      <ThemeRegistry>
        <App />
      </ThemeRegistry>
    </Web3Provider>
  </StrictMode>
);
