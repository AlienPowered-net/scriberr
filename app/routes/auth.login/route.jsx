import { useState } from "react";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import {
  AppProvider as PolarisAppProvider,
  Button,
  Card,
  Page,
  Text,
  TextField,
  BlockStack,
} from "@shopify/polaris";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  console.info("[Auth Login] Incoming request", {
    url: request.url,
    shop,
    hasShop: !!shop,
  });

  // If shop param exists, immediately redirect into OAuth
  if (shop) {
    console.info("[Auth Login] Shop param provided, redirecting to /auth", { shop });
    return redirect(`/auth?shop=${encodeURIComponent(shop)}`);
  }

  // Otherwise, show the login form
  console.info("[Auth Login] No shop param, showing login form");
  const errors = loginErrorMessage(await login(request));

  return { errors, polarisTranslations };
};

export const action = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <PolarisAppProvider i18n={loaderData.polarisTranslations}>
      <Page>
        <Card>
          <Form method="post">
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Log in
              </Text>
              <TextField
                type="text"
                name="shop"
                label="Shop domain"
                helpText="example.myshopify.com"
                value={shop}
                onChange={setShop}
                autoComplete="on"
                error={errors.shop}
              />
              <Button submit>Log in</Button>
            </BlockStack>
          </Form>
        </Card>
      </Page>
    </PolarisAppProvider>
  );
}
