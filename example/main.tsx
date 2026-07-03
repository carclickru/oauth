import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CarClickOAuthButton } from "../src";
import "../src/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CarClickOAuthButton onClick={() => undefined} />
  </StrictMode>
);
