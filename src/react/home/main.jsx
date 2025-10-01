import React from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import { HomePage } from "./HomePage.jsx";

const rootEl = document.getElementById("home-root");
const root = createRoot(rootEl);
root.render(<HomePage />);

