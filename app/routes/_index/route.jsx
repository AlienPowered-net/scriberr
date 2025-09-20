import { redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  // If there's a shop parameter, redirect to the app (Shopify app context)
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  // For direct domain visits, show the coming soon page
  return { showForm: Boolean(login) };
};

export default function ComingSoonPage() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Logo and Brand Name */}
        <div className={styles.logo}>
          <img 
            src="/scriberr-logo.png" 
            alt="Scriberr Logo" 
            className={styles.logoImage}
          />
        </div>

        {/* Description Text */}
        <p className={styles.description}>
          Designed for Shopify merchants, Scriberr keeps your thoughts, tasks, and ideas in sync, so you can focus more on building your business.
        </p>

        {/* Coming Soon Message */}
        <div className={styles.comingSoon}>COMING SOON</div>

        {/* Hidden form for development - only show if login is configured */}
        {showForm && (
          <div style={{ display: 'none' }}>
            <form method="post" action="/auth/login">
              <input type="text" name="shop" />
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
