// app/routes/api.db-health.jsx
import { json } from "@remix-run/node";

export async function loader({ request }) {
  // Dynamic imports for server-only modules
  const [{ checkDatabaseHealth, repairDatabaseHealth }] = await Promise.all([
    import("../utils/db-health.server"),
  ]);

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  try {
    if (action === 'repair') {
      const result = await repairDatabaseHealth();
      return json({
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      const health = await checkDatabaseHealth();
      return json({
        health,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function action({ request }) {
  // Dynamic imports for server-only modules
  const [{ repairDatabaseHealth }] = await Promise.all([
    import("../utils/db-health.server"),
  ]);

  const formData = await request.formData();
  const action = formData.get('action');
  
  try {
    if (action === 'repair') {
      const result = await repairDatabaseHealth();
      return json({
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      return json({
        success: false,
        message: 'Invalid action. Use "repair" to fix database issues.',
      }, { status: 400 });
    }
  } catch (error) {
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
