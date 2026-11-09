import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./light-theme.css";
import App from "./App.jsx";
import { Provider } from "react-redux";
import store from "./redux/store.js";
import { SnackbarProvider } from "notistack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./i18n/index.js";
import { purgeLegacyApiCaches } from "./utils/purgeLegacyApiCaches.js";

import LanguageSync
    from "./i18n/LanguageSync.jsx";

// Borra exclusivamente restos de cache API anteriores, sin borrar el shell offline.
purgeLegacyApiCaches().catch((error) =>
    console.warn("No se pudo limpiar la cache API antigua:", error)
);
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30000,
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            refetchOnReconnect: true,
        },
    },
});
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <Provider store={store}>
          <LanguageSync />
        <SnackbarProvider autoHideDuration={3000}>
          <QueryClientProvider client={queryClient} >
            <App />
          </QueryClientProvider>
        </SnackbarProvider>
      </Provider>
    </ThemeProvider>
  </StrictMode>
);