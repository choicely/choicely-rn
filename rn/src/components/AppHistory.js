import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { createBridgeClient } from "../bridge/ChoicelyRNBridge";

const DefaultHeader = () => <Text style={styles.title}>My apps</Text>;

export default function AppHistory({
  onAppSelect,
  scrollEnabled = true,
  renderHeader,
  isDashboard = false,
  refreshToken = 0,
}) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const bridge = useMemo(() => createBridgeClient(), []);

  const loadHistory = React.useCallback(() => {
    setLoading(true);
    bridge
      .request("choicely:app:getHistory")
      .then((res) => {
        console.log("[AppHistory] choicely:app:getHistory response:", res);
        const sortedApps = [...(res.apps || [])].sort((a, b) => {
          const aUpdated = Number(a?.updated) || 0;
          const bUpdated = Number(b?.updated) || 0;
          return bUpdated - aUpdated;
        });
        setApps(sortedApps);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load history:", err);
        setLoading(false);
      });
  }, [bridge]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshToken]);

  useEffect(
    () => () => {
      bridge.destroy();
    },
    [bridge]
  );

  const handlePress = async (appKey, appName) => {
    if (switching) return;
    if (!appKey) {
      console.error("AppHistory: handlePress called with missing appKey");
      return;
    }

    console.log("[AppHistory] Item pressed:", { appKey, appName });

    if (onAppSelect) {
      try {
        const handled = await onAppSelect({ appKey, appName });
        console.log("[AppHistory] onAppSelect result:", {
          appKey,
          appName,
          handled,
        });
        if (handled) {
          console.log(
            "[AppHistory] handled by onAppSelect, skipping native choicely:app:load"
          );
          return;
        }
      } catch (error) {
        console.error("AppHistory: onAppSelect handler failed:", error);
      }
    }

    // Optimistically show loading or feedback
    setSwitching(true);
    console.log("[AppHistory] Falling back to bridge choicely:app:load", {
      appKey,
    });

    bridge
      .request("choicely:app:load", { appKey })
      .then(() => {
        // Success - the native side should trigger a reload/content update.
        // We might not even reach here if the activity restarts.
        if (onAppSelect) onAppSelect(appKey);
        console.log("[AppHistory] choicely:app:load succeeded", { appKey });
        setSwitching(false);
      })
      .catch((err) => {
        console.error("Failed to switch app:", err);
        setSwitching(false);
        // TODO: Show error toast
      });
  };

  const handleRemove = async (appKey) => {
    if (!appKey) return;
    try {
      await bridge.request("choicely:app:remove", { appKey });
      setApps((prev) => prev.filter((app) => app.key !== appKey));
    } catch (err) {
      console.error("Failed to remove app:", err);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    // Format: Viewed 1st Jan 2026
    // Simple fallback
    return `Viewed ${date.getDate()} ${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, scrollEnabled && styles.flex1]}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  if (apps.length === 0 && !loading) {
    const HeaderComponent = renderHeader || DefaultHeader;
    return (
      <View style={[styles.container, scrollEnabled && styles.flex1]}>
        {typeof HeaderComponent === "function" ? (
          <HeaderComponent />
        ) : (
          HeaderComponent
        )}
        <Text style={styles.emptyText}>No recent apps found.</Text>
      </View>
    );
  }

  const HeaderComponent = renderHeader || DefaultHeader;
  return (
    <View
      style={[
        styles.container,
        scrollEnabled && styles.flex1,
        isDashboard && styles.dashboardContainer,
      ]}
    >
      <FlatList
        ListHeaderComponent={HeaderComponent}
        data={apps}
        keyExtractor={(item) => item.key || item.appKey}
        horizontal={false}
        scrollEnabled={scrollEnabled}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => handlePress(item.key || item.appKey, item.name)}
            disabled={switching}
          >
            <View style={styles.iconPlaceholder}>
              {/* TODO: Load actual icon if available */}
              {item.icon ? (
                <Image source={{ uri: item.icon }} style={styles.iconImage} />
              ) : (
                <Text style={styles.iconText}>
                  {item.name ? item.name.charAt(0).toUpperCase() : "?"}
                </Text>
              )}
            </View>
            <View style={styles.info}>
              <Text style={styles.appName}>{item.name || "Unnamed App"}</Text>
              <Text style={styles.appDate}>
                {item.updated ? formatDate(item.updated) : "Viewed recently"}
              </Text>
            </View>
            {switching && <ActivityIndicator size="small" color="#000" />}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemove(item.key)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color="#666" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  dashboardContainer: {
    marginTop: 0,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
  },
  flex1: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#000",
  },
  emptyText: {
    fontStyle: "italic",
    color: "#666",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    // Removed border for cleaner look in dashboard, or keep it? Mockup seems clean.
    // borderBottomWidth: 1,
    // borderBottomColor: '#f0f0f0'
    marginBottom: 8,
  },
  iconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12, // Rounded corners matching mockup
    backgroundColor: "#eee", // Or a gradient/color based on app?
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  iconImage: {
    width: "100%",
    height: "100%",
  },
  iconText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#666",
  },
  info: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  appDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
