import { useCallback, useEffect, useState } from "react";

const DEFAULT_UPGRADE_MESSAGE =
  "Upgrade your Shopify managed plan to unlock this feature.";

export function usePlanUsage({ autoRefresh = true } = {}) {
  const [plan, setPlan] = useState(null);
  const [usage, setUsage] = useState({});
  const [loading, setLoading] = useState(autoRefresh);
  const [error, setError] = useState(null);
  const [upgradePrompt, setUpgradePromptState] = useState({
    open: false,
    message: "",
    plan: null,
  });

  const closeUpgradePrompt = useCallback(() => {
    setUpgradePromptState({
      open: false,
      message: "",
      plan: null,
    });
  }, []);

  const showUpgradePrompt = useCallback((data) => {
    setUpgradePromptState({
      open: true,
      message: data?.message ?? DEFAULT_UPGRADE_MESSAGE,
      plan: data?.plan ?? null,
    });
  }, []);

  const fetchPlanUsage = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/plan-usage");
      const data = await response.json();

      if (response.status === 403) {
        showUpgradePrompt(data);
        setPlan(data.plan ?? null);
        setUsage(data.usage ?? {});
        setError({
          code: data.code ?? "plan_access_denied",
          message: data.message ?? DEFAULT_UPGRADE_MESSAGE,
        });
        return { ok: false, data };
      }

      if (!response.ok || !data.success) {
        const message =
          data.error || data.message || "Failed to load plan usage.";
        setError({ code: "plan_usage_error", message });
        return { ok: false, data };
      }

      setPlan(data.plan);
      setUsage(data.usage ?? {});
      setError(null);
      return { ok: true, data };
    } catch (err) {
      setError(err);
      return { ok: false, error: err };
    } finally {
      setLoading(false);
    }
  }, [showUpgradePrompt]);

  useEffect(() => {
    if (autoRefresh) {
      fetchPlanUsage();
    }
  }, [autoRefresh, fetchPlanUsage]);

  const handlePlanResponse = useCallback(
    async (response) => {
      const data = await response.json();
      if (response.status === 403) {
        showUpgradePrompt(data);
        return { ok: false, data, status: response.status };
      }
      return { ok: response.ok, data, status: response.status };
    },
    [showUpgradePrompt],
  );

  return {
    plan,
    usage,
    loading,
    error,
    upgradePrompt,
    showUpgradePrompt,
    closeUpgradePrompt,
    refreshPlan: fetchPlanUsage,
    handlePlanResponse,
  };
}
