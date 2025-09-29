// app/routes/app._index.jsx - Redirect to home page
import { redirect } from "@remix-run/node";

export const loader = async () => {
  return redirect("/app/home");
};