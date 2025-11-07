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
    $test: Boolean!
    $lineItems: [AppSubscriptionLineItemInput!]!
  ) {
    appSubscriptionCreate(
      input: {
        name: $name
        test: $test
        returnUrl: $returnUrl
        lineItems: $lineItems
      }
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
`;

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
    name = "Scriberr Pro Plan",
  }: CreateSubscriptionOptions = {},
) {
  const response = await admin.graphql(APP_SUBSCRIPTION_CREATE_MUTATION, {
    variables: {
      name,
      returnUrl,
      test,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount,
                currencyCode: currency,
              },
              interval: "EVERY_30_DAYS",
            },
          },
        },
      ],
    },
  });

  const payload = await response.json();

  const errors = payload?.data?.appSubscriptionCreate?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(
      `Failed to create subscription: ${errors
        .map((err: { message: string }) => err.message)
        .join(", ")}`,
    );
  }

  const confirmationUrl = payload?.data?.appSubscriptionCreate?.confirmationUrl;
  if (!confirmationUrl) {
    throw new Error("Shopify did not return a confirmation URL.");
  }

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
  const response = await admin.graphql(APP_SUBSCRIPTION_QUERY, {
    variables: { id: subscriptionGid },
  });

  const payload = await response.json();
  const subscription = payload?.data?.appSubscription;

  if (!subscription) {
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

