import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import TemplateDetailScreen from "./TemplateDetailScreen";
import { useTemplates } from "./TemplatesProvider";
import { useBrandManager } from "../../hooks/useBrandManager";
import { applyTemplateBlueprint } from "../../services/ChoicelyApiService";
import { createBridgeClient } from "../../bridge/ChoicelyRNBridge";
import ScreenLayout from "../../components/ScreenLayout";

const TemplateDetailRoute = ({ navigation, route }) => {
  const { templates, loading, error } = useTemplates();
  const brandManager = useBrandManager();
  const [useTemplateLoading, setUseTemplateLoading] = useState(false);
  const [useTemplateError, setUseTemplateError] = useState(null);
  const [createdApp, setCreatedApp] = useState(null);

  const templateKey = route?.params?.templateKey;
  const template = useMemo(
    () => templates.find((item) => item.key === templateKey),
    [templates, templateKey]
  );

  const handleUseTemplate = useCallback(
    async (blueprintKey, templateTitle) => {
      setUseTemplateLoading(true);
      setUseTemplateError(null);

      const bridge = createBridgeClient();
      try {
        const { isLoggedIn, isAnonymous } = await bridge.request(
          "choicely:auth:checkLogin"
        );
        if (!isLoggedIn || isAnonymous) {
          setUseTemplateError("Please log in to use templates.");
          await bridge.request("choicely:auth:openLogin");
          return;
        }

        const userInfo = await bridge.request("choicely:auth:getUserInfo");
        if (!userInfo?.accessToken || !userInfo?.userKey) {
          setUseTemplateError("Please log in to use templates.");
          await bridge.request("choicely:auth:openLogin");
          return;
        }

        const { brandKey } = await brandManager.getUserBrandKey(userInfo);

        const result = await applyTemplateBlueprint(
          userInfo.accessToken,
          brandKey,
          blueprintKey
        );

        if (!result.appKey) {
          throw new Error("Failed to create app from template");
        }

        const appTitle = templateTitle || "Template App";
        await bridge.request("choicely:app:store", {
          appKey: result.appKey,
          title: appTitle,
          updated: Date.now(),
        });

        try {
          const { getMMKV } = await import("../../state/mmkv");
          const storage = getMMKV();
          const pendingTemplateData = JSON.stringify({
            appKey: result.appKey,
            brandKey: brandKey,
            message: `Created from template: ${templateTitle || "Template"}`,
            timestamp: Date.now(),
          });
          storage.set("choicely_pending_template_app", pendingTemplateData);
          console.log("[TemplateDetailRoute] Saved pending template message");
        } catch (storageErr) {
          console.warn(
            "[TemplateDetailRoute] Failed to save pending template message:",
            storageErr
          );
        }

        // Surface the created app for the user to open manually via the
        // "Open Preview" button instead of auto-loading it.
        setCreatedApp({ appKey: result.appKey, brandKey });
      } catch (err) {
        console.error("[TemplateDetailRoute] Use template failed:", err);
        setUseTemplateError(err.message || "Failed to use template");
      } finally {
        bridge.destroy();
        setUseTemplateLoading(false);
      }
    },
    [brandManager]
  );

  const handleOpenPreview = useCallback(async () => {
    if (!createdApp) return;
    const bridge = createBridgeClient();
    try {
      await bridge.request("choicely:app:load", {
        appKey: createdApp.appKey,
        brandKey: createdApp.brandKey,
      });
    } catch (err) {
      console.warn("[TemplateDetailRoute] Failed to open preview:", err);
    } finally {
      bridge.destroy();
    }
  }, [createdApp]);

  if (!template && loading) {
    return (
      <ScreenLayout title="Template" canGoBack={navigation.canGoBack} onBack={navigation.goBack}>
        <View style={styles.empty}>
          <ActivityIndicator size="small" color="#111" />
        </View>
      </ScreenLayout>
    );
  }

  if (!template && !loading) {
    return (
      <ScreenLayout title="Template" canGoBack={navigation.canGoBack} onBack={navigation.goBack}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Template not found</Text>
          {error ? <Text style={styles.emptySubtitle}>{error}</Text> : null}
        </View>
      </ScreenLayout>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <TemplateDetailScreen
      template={template}
      onBack={navigation.goBack}
      canGoBack={navigation.canGoBack}
      onUseTemplate={handleUseTemplate}
      useTemplateLoading={useTemplateLoading}
      useTemplateError={useTemplateError}
      createdApp={createdApp}
      onOpenPreview={handleOpenPreview}
    />
  );
};

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
  },
});

export default TemplateDetailRoute;
