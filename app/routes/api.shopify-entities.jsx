import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";

// GET - Fetch Shopify entities based on query parameter
export async function loader({ request }) {
  try {
    const { admin, session } = await shopify.authenticate.admin(request);
    const url = new URL(request.url);
    const query = url.searchParams.get("query") || "";
    const entityType = url.searchParams.get("type") || "all";

    const results = {
      products: [],
      orders: [],
      customers: [],
      collections: [],
      discounts: [],
      draftOrders: []
    };

    // Fetch Products if requested
    if (entityType === "all" || entityType === "products") {
      try {
        const productsResponse = await admin.graphql(`
          query getProducts($query: String!) {
            products(first: 10, query: $query) {
              edges {
                node {
                  id
                  title
                  handle
                  status
                  featuredImage {
                    url
                  }
                  variants(first: 5) {
                    edges {
                      node {
                        id
                        title
                        sku
                        displayName
                      }
                    }
                  }
                }
              }
            }
          }
        `, {
          variables: { query: query || "*" }
        });

        const productsData = await productsResponse.json();
        if (productsData?.data?.products?.edges) {
          results.products = productsData.data.products.edges.map(({ node }) => {
            const productId = node.id.split('/').pop();
            return {
              id: node.id,
              numericId: productId,
              title: node.title,
              handle: node.handle,
              status: node.status,
              image: node.featuredImage?.url,
              type: "product",
              adminUrl: `https://${session.shop}/admin/products/${productId}`,
              // Include variants for SKU searches
              variants: node.variants.edges.map(({ node: variant }) => ({
                id: variant.id,
                numericId: variant.id.split('/').pop(),
                title: variant.title,
                sku: variant.sku,
                displayName: variant.displayName,
                type: "variant",
                adminUrl: `https://${session.shop}/admin/products/${productId}/variants/${variant.id.split('/').pop()}`
              }))
            };
          });
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    }

    // Fetch Orders if requested
    if (entityType === "all" || entityType === "orders") {
      try {
        const ordersResponse = await admin.graphql(`
          query getOrders($query: String!) {
            orders(first: 10, query: $query) {
              edges {
                node {
                  id
                  name
                  displayFinancialStatus
                  displayFulfillmentStatus
                  customer {
                    displayName
                  }
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  createdAt
                }
              }
            }
          }
        `, {
          variables: { query: query || "*" }
        });

        const ordersData = await ordersResponse.json();
        if (ordersData?.data?.orders?.edges) {
          results.orders = ordersData.data.orders.edges.map(({ node }) => {
            const orderId = node.id.split('/').pop();
            return {
              id: node.id,
              numericId: orderId,
              name: node.name,
              customerName: node.customer?.displayName,
              financialStatus: node.displayFinancialStatus,
              fulfillmentStatus: node.displayFulfillmentStatus,
              totalPrice: node.totalPriceSet?.shopMoney?.amount,
              currency: node.totalPriceSet?.shopMoney?.currencyCode,
              createdAt: node.createdAt,
              type: "order",
              adminUrl: `https://${session.shop}/admin/orders/${orderId}`
            };
          });
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    }

    // Fetch Customers if requested
    if (entityType === "all" || entityType === "customers") {
      try {
        const customersResponse = await admin.graphql(`
          query getCustomers($query: String!) {
            customers(first: 10, query: $query) {
              edges {
                node {
                  id
                  displayName
                  email
                  phone
                  numberOfOrders
                }
              }
            }
          }
        `, {
          variables: { query: query || "*" }
        });

        const customersData = await customersResponse.json();
        if (customersData?.data?.customers?.edges) {
          results.customers = customersData.data.customers.edges.map(({ node }) => {
            const customerId = node.id.split('/').pop();
            return {
              id: node.id,
              numericId: customerId,
              displayName: node.displayName,
              email: node.email,
              phone: node.phone,
              numberOfOrders: node.numberOfOrders,
              type: "customer",
              adminUrl: `https://${session.shop}/admin/customers/${customerId}`
            };
          });
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    }

    // Fetch Collections if requested
    if (entityType === "all" || entityType === "collections") {
      try {
        const collectionsResponse = await admin.graphql(`
          query getCollections($query: String!) {
            collections(first: 10, query: $query) {
              edges {
                node {
                  id
                  title
                  handle
                  productsCount {
                    count
                  }
                }
              }
            }
          }
        `, {
          variables: { query: query || "*" }
        });

        const collectionsData = await collectionsResponse.json();
        if (collectionsData?.data?.collections?.edges) {
          results.collections = collectionsData.data.collections.edges.map(({ node }) => {
            const collectionId = node.id.split('/').pop();
            return {
              id: node.id,
              numericId: collectionId,
              title: node.title,
              handle: node.handle,
              productsCount: node.productsCount?.count || 0,
              type: "collection",
              adminUrl: `https://${session.shop}/admin/collections/${collectionId}`
            };
          });
        }
      } catch (error) {
        console.error("Error fetching collections:", error);
      }
    }

    // Fetch Discounts if requested
    if (entityType === "all" || entityType === "discounts") {
      try {
        const discountsResponse = await admin.graphql(`
          query getDiscounts($query: String!) {
            codeDiscountNodes(first: 10, query: $query) {
              edges {
                node {
                  id
                  codeDiscount {
                    ... on DiscountCodeBasic {
                      title
                      codes(first: 1) {
                        edges {
                          node {
                            code
                          }
                        }
                      }
                      status
                    }
                    ... on DiscountCodeBxgy {
                      title
                      codes(first: 1) {
                        edges {
                          node {
                            code
                          }
                        }
                      }
                      status
                    }
                    ... on DiscountCodeFreeShipping {
                      title
                      codes(first: 1) {
                        edges {
                          node {
                            code
                          }
                        }
                      }
                      status
                    }
                  }
                }
              }
            }
          }
        `, {
          variables: { query: query || "*" }
        });

        const discountsData = await discountsResponse.json();
        if (discountsData?.data?.codeDiscountNodes?.edges) {
          results.discounts = discountsData.data.codeDiscountNodes.edges.map(({ node }) => {
            const discountId = node.id.split('/').pop();
            const discount = node.codeDiscount;
            const code = discount?.codes?.edges?.[0]?.node?.code;
            return {
              id: node.id,
              numericId: discountId,
              title: discount?.title,
              code: code,
              status: discount?.status,
              type: "discount",
              adminUrl: `https://${session.shop}/admin/discounts/${discountId}`
            };
          });
        }
      } catch (error) {
        console.error("Error fetching discounts:", error);
      }
    }

    // Fetch Draft Orders if requested
    if (entityType === "all" || entityType === "draftOrders") {
      try {
        const draftOrdersResponse = await admin.graphql(`
          query getDraftOrders($query: String!) {
            draftOrders(first: 10, query: $query) {
              edges {
                node {
                  id
                  name
                  customer {
                    displayName
                  }
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  status
                  createdAt
                }
              }
            }
          }
        `, {
          variables: { query: query || "*" }
        });

        const draftOrdersData = await draftOrdersResponse.json();
        if (draftOrdersData?.data?.draftOrders?.edges) {
          results.draftOrders = draftOrdersData.data.draftOrders.edges.map(({ node }) => {
            const draftOrderId = node.id.split('/').pop();
            return {
              id: node.id,
              numericId: draftOrderId,
              name: node.name,
              customerName: node.customer?.displayName,
              status: node.status,
              totalPrice: node.totalPriceSet?.shopMoney?.amount,
              currency: node.totalPriceSet?.shopMoney?.currencyCode,
              createdAt: node.createdAt,
              type: "draftOrder",
              adminUrl: `https://${session.shop}/admin/draft_orders/${draftOrderId}`
            };
          });
        }
      } catch (error) {
        console.error("Error fetching draft orders:", error);
      }
    }

    return json({ success: true, results });
  } catch (error) {
    console.error("Error fetching Shopify entities:", error);
    console.error("Error details:", error.message, error.stack);
    return json({ 
      success: false, 
      error: error.message,
      errorDetails: error.stack,
      results: {
        products: [],
        orders: [],
        customers: [],
        collections: [],
        discounts: [],
        draftOrders: []
      }
    }, { status: 500 });
  }
}
