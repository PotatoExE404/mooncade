import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { Lab } from "./pages/Lab";

const lab = import.meta.env.DEV && location.pathname === "/lab";

createRoot(document.getElementById("root")!).render(<StrictMode>{lab ? <Lab /> : <App />}</StrictMode>);
