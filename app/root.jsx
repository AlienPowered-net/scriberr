// app/root.jsx
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import { AppProvider } from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css"; // Polaris (bundled)
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css"; // Mantine styles

// ✅ Import your local CSS and pass its URL to <Links/>
import notepadCssUrl from "./styles/notepad.css?url";
import tiptapCssUrl from "./styles/tiptap.css?url";
import fontAwesomeCssUrl from "@fortawesome/fontawesome-free/css/all.min.css?url";
import mantineOverridesCssUrl from "./styles/mantine-overrides.css?url";

export const links = () => [
  { rel: "stylesheet", href: notepadCssUrl },
  { rel: "stylesheet", href: tiptapCssUrl },
  { rel: "stylesheet", href: fontAwesomeCssUrl },
  { rel: "stylesheet", href: mantineOverridesCssUrl },
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider i18n={en}>
          <MantineProvider>
            <Outlet />
          </MantineProvider>
        </AppProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
