import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {Agentation} from "agentation";
import {App} from "./ui/App.js";

const root = document.getElementById("app");

if (!root) {
	throw new Error("Root element not found");
}

createRoot(root).render(
	<StrictMode>
		{import.meta.env.DEV && <Agentation />}
		<App />
	</StrictMode>,
);
