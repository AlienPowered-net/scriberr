// app/routes/app.jsx
import { Outlet } from "@remix-run/react";
import {
  AppProvider as PolarisAppProvider,
} from "@shopify/shopify-app-remix/react";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";

export default function App() {
  return (
    <PolarisAppProvider i18n={enTranslations}>
      <Outlet />
    </PolarisAppProvider>
  );
}
