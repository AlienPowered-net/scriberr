import type { SubscriptionStatus } from "@prisma/client";

type AdminGraphqlClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

export interface CreateSubscriptionOptions {
  test?: boolean;
  currency?: string;
  amount?: number;
  name?: string;
}

const APP_SUBSCRIPTION_CREATE_MUTATION = /* GraphQL */ `
  mutation AppSubscriptionCreate(
    $name: String!
    $returnUrl: URL!
    $test: Boolean
    $lineItems: [AppSubscriptionLineItemInput!]!
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      test: $test
      lineItems: $lineItems
    ) {
      appSubscription {
        id
        status
        name
        test
      }
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

// Query to fetch app subscription details
// Note: TypeScript linter may show an error here due to outdated GraphQL schema,
// but appSubscription is a valid field in Shopify's Admin GraphQL API for billing
const APP_SUBSCRIPTION_QUERY = /* GraphQL */ `
  query AppSubscription($id: ID!) {
    appSubscription(id: $id) {
      id
      name
      status
      test
      trialEndsAt
      createdAt
      currentPeriodEnd
      lineItems {
        plan {
          pricingDetails {
            ... on AppRecurringPricing {
              interval
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
` as string;

export interface ShopifySubscription {
  id: string;
  name: string;
  status: string;
  test: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  currentPeriodEnd: string | null;
  priceAmount: number | null;
  currencyCode: string | null;
  billingInterval: string | null;
}

export async function createProSubscription(
  admin: AdminGraphqlClient,
  returnUrl: string,
  {
    test = true,
    currency = "USD",
    amount = 5,
    name = "Scriberr Pro – $5/month",
  }: CreateSubscriptionOptions = {},
) {
  // Ensure all variables are explicitly defined and properly typed
  const variables = {
    name: name || "Scriberr Pro – $5/month",
    returnUrl: returnUrl,
    test: Boolean(test), // Explicitly convert to boolean, default to true for test mode
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: {
              amount: Number(amount),
              currencyCode: currency || "USD",
            },
            interval: "EVERY_30_DAYS",
          },
        },
      },
    ],
  };

  console.log("[Billing] Creating subscription with variables:", {
    name: variables.name,
    returnUrl: variables.returnUrl,
    test: variables.test,
    amount: variables.lineItems[0].plan.appRecurringPricingDetails.price.amount,
    currency: variables.lineItems[0].plan.appRecurringPricingDetails.price.currencyCode,
  });

  const response = await admin.graphql(APP_SUBSCRIPTION_CREATE_MUTATION, {
    variables,
  });

  const payload = await response.json();

  // Check for GraphQL errors first
  if (payload?.errors && payload.errors.length > 0) {
    const errorMessages = payload.errors
      .map((err: any) => err.message || JSON.stringify(err))
      .join(", ");
    console.error("[Billing] GraphQL errors:", payload.errors);
    throw new Error(`Shopify GraphQL error: ${errorMessages}`);
  }

  // Check for user errors from the mutation
  const errors = payload?.data?.appSubscriptionCreate?.userErrors ?? [];
  if (errors.length > 0) {
    const errorMessages = errors
      .map((err: { message: string; field?: string[] }) => 
        err.field ? `${err.field.join(".")}: ${err.message}` : err.message
      )
      .join(", ");
    console.error("[Billing] User errors:", errors);
    throw new Error(`Failed to create subscription: ${errorMessages}`);
  }

  const confirmationUrl = payload?.data?.appSubscriptionCreate?.confirmationUrl;
  if (!confirmationUrl) {
    console.error("[Billing] No confirmation URL in response:", payload?.data);
    throw new Error("Shopify did not return a confirmation URL.");
  }

  console.log("[Billing] Subscription created successfully, confirmationUrl:", confirmationUrl);

  return {
    confirmationUrl,
    subscriptionId:
      payload?.data?.appSubscriptionCreate?.appSubscription?.id ?? null,
  };
}

export async function fetchSubscription(
  admin: AdminGraphqlClient,
  subscriptionGid: string,
): Promise<ShopifySubscription> {
  console.log("[Billing Confirm] fetchSubscription called with:", {
    subscriptionGid,
  });

  const response = await admin.graphql(APP_SUBSCRIPTION_QUERY, {
    variables: { id: subscriptionGid },
  });

  console.log("[Billing Confirm] HTTP response status:", {
    status: response.status,
    ok: response.ok,
    statusText: response.statusText,
  });

  // Always try to parse JSON response, whether success or error
  let payload;
  try {
    payload = await response.json();
  } catch (jsonError) {
    console.error("[Billing Confirm] Failed to parse JSON response:", jsonError);
    throw new Error(`Invalid JSON response from Shopify API (HTTP ${response.status})`);
  }
  
  console.log("[Billing Confirm] fetchSubscription parsed response:", {
    hasData: Boolean(payload?.data),
    hasErrors: Boolean(payload?.errors),
    errors: payload?.errors,
    appSubscriptionExists: Boolean(payload?.data?.appSubscription),
  });

  // Check for GraphQL errors
  if (payload?.errors && payload.errors.length > 0) {
    console.error("[Billing Confirm] GraphQL errors when loading subscription:", payload.errors);
    throw new Error(`Unable to load subscription details from Shopify (GraphQL error: ${payload.errors[0].message}).`);
  }

  const subscription = payload?.data?.appSubscription;

  if (!subscription) {
    console.error("[Billing Confirm] No appSubscription returned in response:", {
      fullData: payload?.data,
      fullPayload: payload,
      subscriptionGid,
    });
    throw new Error("Unable to load subscription details from Shopify.");
  }

  const lineItem = subscription.lineItems?.[0];
  const pricing = lineItem?.plan?.pricingDetails;
  const recurring = pricing?.price
    ? {
        amount: Number(pricing.price.amount),
        currencyCode: pricing.price.currencyCode ?? null,
        interval: pricing.interval ?? null,
      }
    : { amount: null, currencyCode: null, interval: null };

  return {
    id: subscription.id,
    name: subscription.name,
    status: subscription.status,
    test: Boolean(subscription.test),
    trialEndsAt: subscription.trialEndsAt ?? null,
    createdAt: subscription.createdAt,
    currentPeriodEnd: subscription.currentPeriodEnd ?? null,
    priceAmount: recurring.amount,
    currencyCode: recurring.currencyCode,
    billingInterval: recurring.interval,
  };
}

export function mapSubscriptionStatus(
  shopifyStatus: string,
): SubscriptionStatus {
  switch (shopifyStatus) {
    case "ACTIVE":
      return "ACTIVE";
    case "CANCELLED":
    case "DECLINED":
    case "EXPIRED":
      return "CANCELED";
    case "FROZEN":
    case "PAUSED":
    case "PENDING":
      return "PAST_DUE";
    default:
      return "NONE";
  }
}

