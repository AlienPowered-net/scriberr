import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // If no shop parameter, redirect to add it
  if (!url.searchParams.get("shop")) {
    const newUrl = new URL(request.url);
    newUrl.searchParams.set("shop", "dev-alienpowered.myshopify.com");
    return redirect(newUrl.toString());
  }
  
  try {
    // This will either authenticate or throw a redirect response
    const { session } = await authenticate.admin(request);
    
    // If we get here, authentication was successful
    return redirect("/app?authenticated=true");
  } catch (error) {
    // If it's a Response (redirect), let it through
    if (error instanceof Response) {
      return error;
    }
    
    // For other errors, show them
    throw error;
  }
};

// This route doesn't render anything - it just handles authentication
export default function SimpleAuth() {
  return null;
}