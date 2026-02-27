import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Switch,
  Modal,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { createBridgeClient } from "../bridge/ChoicelyRNBridge";
import ScreenLayout from "./ScreenLayout";

// Plan feature lists
const FREE_FEATURES = [
  "1000 Monthly Credits",
  "Usage-based Cloud+AI",
  "Credit rollovers",
  "On-demand Credit Top-Ups",
  "Dynamic Links",
  "In-App Purchases",
];

const PREMIUM_FEATURES = ["Lorem ipsum", "Lorem ipsum", "Lorem ipsum"];

const ENTERPRISE_FEATURES = [
  "Dedicated Support",
  "Onboarding Services",
  "Design Services",
  "Strategy Services",
  "Publishing Services",
  "Support for Custom Integrations",
];

// Mock user plan data
const MOCK_USER_PLAN = {
  planType: "free",
  planName: "Free",
  creditsUsed: 2,
  creditsTotal: 5,
  monthlyPrice: null,
};

/** Credit Progress Bar */
const CreditProgressBar = ({ used, total, color = "#3dcea5" }) => {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {used}/{total}
      </Text>
    </View>
  );
};

/** Feature list item */
const FeatureItem = ({ label }) => (
  <View style={styles.featureRow}>
    <Ionicons name="checkmark" size={16} color="#3dcea5" />
    <Text style={styles.featureText}>{label}</Text>
  </View>
);

/** Plan Card */
const PlanCard = ({
  name,
  description,
  price,
  isAnnual,
  onToggleAnnual,
  creditsLabel,
  features,
  featureHeader,
  onUpgrade,
  showBookDemo,
  onBookDemo,
}) => (
  <View style={styles.planCard}>
    <Text style={styles.planName}>{name}</Text>
    {description && <Text style={styles.planDesc}>{description}</Text>}

    {price !== undefined && (
      <View style={styles.priceRow}>
        <Text style={styles.priceSymbol}>€</Text>
        <Text style={styles.priceAmount}>{price}</Text>
        <Text style={styles.priceInterval}>/month</Text>
      </View>
    )}

    {onToggleAnnual && (
      <View style={styles.billingToggle}>
        <Switch
          value={isAnnual}
          onValueChange={onToggleAnnual}
          trackColor={{ false: "#ccc", true: "#3dcea5" }}
          thumbColor="#fff"
        />
        <Text style={styles.billingLabel}>Annual billing</Text>
      </View>
    )}

    {showBookDemo ? (
      <TouchableOpacity style={styles.bookDemoBtn} onPress={onBookDemo}>
        <Text style={styles.bookDemoText}>Book a demo</Text>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
        <Text style={styles.upgradeBtnText}>Upgrade</Text>
      </TouchableOpacity>
    )}

    {creditsLabel && (
      <View style={styles.creditsDropdown}>
        <Text style={styles.creditsDropdownText}>{creditsLabel}</Text>
        <Ionicons name="chevron-down" size={16} color="#666" />
      </View>
    )}

    <Text style={styles.featuresHeader}>{featureHeader}</Text>
    {features.map((f, i) => (
      <FeatureItem key={i} label={f} />
    ))}
  </View>
);

/** Current Plan Card */
const CurrentPlanCard = ({
  planName,
  monthlyPrice,
  creditsUsed,
  creditsTotal,
  isPaid,
  onManage,
}) => (
  <View style={styles.currentPlanCard}>
    <Text style={styles.currentPlanTitle}>Your current plan:</Text>
    <Text style={styles.currentPlanName}>
      {planName}
      {monthlyPrice && (
        <Text style={styles.currentPlanPrice}> {monthlyPrice}€/month</Text>
      )}
    </Text>

    <Text style={styles.creditsLabel}>Credits remaining</Text>
    <CreditProgressBar used={creditsUsed} total={creditsTotal} />

    {isPaid && (
      <TouchableOpacity style={styles.manageSubBtn} onPress={onManage}>
        <Text style={styles.manageSubText}>Manage subscription</Text>
      </TouchableOpacity>
    )}
  </View>
);

/** Upgrade Overlay Modal */
const UpgradeOverlay = ({ visible, onClose, onUpgrade }) => {
  const [annual, setAnnual] = useState(true);
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlayBackdrop}>
        <View style={styles.overlayContent}>
          <TouchableOpacity style={styles.overlayClose} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.overlayTitle}>Daily limit reached</Text>
          <Text style={styles.overlaySub}>
            You've used today's free credits. Upgrade to keep building.
          </Text>

          <View style={styles.overlayPlan}>
            <Text style={styles.planName}>Premium</Text>
            <Text style={styles.planDesc}>
              Designed for fast-moving teams building together in real time.
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceSymbol}>€</Text>
              <Text style={styles.priceAmount}>25</Text>
              <Text style={styles.priceInterval}>/month</Text>
            </View>
            <View style={styles.billingToggle}>
              <Switch
                value={annual}
                onValueChange={setAnnual}
                trackColor={{ false: "#ccc", true: "#3dcea5" }}
                thumbColor="#fff"
              />
              <Text style={styles.billingLabel}>Annual billing</Text>
            </View>
            <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
              <Text style={styles.upgradeBtnText}>Upgrade</Text>
            </TouchableOpacity>
            <View style={styles.creditsDropdown}>
              <Text style={styles.creditsDropdownText}>
                1000 credits / month
              </Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </View>
            <Text style={styles.featuresHeader}>
              All features in Free, plus:
            </Text>
            {FREE_FEATURES.map((f, i) => (
              <FeatureItem key={i} label={f} />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ProfileScreen = ({ navigation }) => {
  const bridge = useMemo(() => createBridgeClient(), []);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authState, setAuthState] = useState({
    isLoggedIn: false,
    isAnonymous: true,
  });
  const [userInfo, setUserInfo] = useState({
    userKey: null,
    accessToken: null,
  });
  const [userPlan] = useState(MOCK_USER_PLAN);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [premiumAnnual, setPremiumAnnual] = useState(true);
  const [businessAnnual, setBusinessAnnual] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const auth = await bridge.request("choicely:auth:checkLogin");
      const info = await bridge.request("choicely:auth:getUserInfo");
      setAuthState({
        isLoggedIn: !!auth?.isLoggedIn,
        isAnonymous: !!auth?.isAnonymous,
      });
      setUserInfo({
        userKey: info?.userKey ?? null,
        accessToken: info?.accessToken ?? null,
      });
      // TODO: fetch actual plan from API
    } catch (e) {
      console.error("ProfileScreen: failed to load", e);
    } finally {
      setLoading(false);
    }
  }, [bridge]);

  useEffect(() => {
    loadProfile();
    return () => bridge.destroy();
  }, [bridge, loadProfile]);

  const handleLogin = async () => {
    try {
      await bridge.request("choicely:auth:openLogin");
      await loadProfile();
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await bridge.request("choicely:auth:logout");
      await loadProfile();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleUpgrade = useCallback((plan) => {
    console.log("Upgrade to:", plan);
    // TODO: implement upgrade flow
  }, []);

  const isAuth = authState.isLoggedIn && !authState.isAnonymous;
  const isPaid = userPlan.planType !== "free";

  return (
    <ScreenLayout
      title="Choicely"
      canGoBack={navigation?.canGoBack}
      onBack={navigation?.goBack}
      rightContent={
        <TouchableOpacity onPress={loadProfile} style={styles.refreshBtn}>
          <MaterialIcons name="refresh" size={18} color="#111" />
        </TouchableOpacity>
      }
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#111" />
          </View>
        ) : (
          <>
            <Text style={styles.pageTitle}>Plans & Credits</Text>

            {/* Current Plan */}
            <CurrentPlanCard
              planName={userPlan.planName}
              monthlyPrice={userPlan.monthlyPrice}
              creditsUsed={userPlan.creditsUsed}
              creditsTotal={userPlan.creditsTotal}
              isPaid={isPaid}
              onManage={() => console.log("Manage subscription")}
            />

            {/* Premium */}
            {userPlan.planType === "free" && (
              <PlanCard
                name="Premium"
                description="Designed for fast-moving teams building together in real time."
                price={25}
                isAnnual={premiumAnnual}
                onToggleAnnual={setPremiumAnnual}
                creditsLabel="1000 credits / month"
                features={FREE_FEATURES}
                featureHeader="All features in Free, plus:"
                onUpgrade={() => handleUpgrade("premium")}
              />
            )}

            {/* Business */}
            {(userPlan.planType === "free" ||
              userPlan.planType === "premium") && (
              <PlanCard
                name="Business"
                description="Lorem ipsum"
                price={50}
                isAnnual={businessAnnual}
                onToggleAnnual={setBusinessAnnual}
                creditsLabel="1000 credits / month"
                features={PREMIUM_FEATURES}
                featureHeader="All features in Premium, plus:"
                onUpgrade={() => handleUpgrade("business")}
              />
            )}

            {/* Enterprise */}
            <PlanCard
              name="Enterprise"
              description="Built for large organisations needing flexibility, scale, and governance."
              showBookDemo
              onBookDemo={() => console.log("Book demo")}
              features={ENTERPRISE_FEATURES}
              featureHeader="All features in Premium, plus:"
            />

            {/* Auth actions */}
            <View style={styles.authSection}>
              {isAuth && userInfo.userKey ? (
                <Text style={styles.authMetaText}>Signed in as {userInfo.userKey}</Text>
              ) : null}
              {isAuth ? (
                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={handleLogout}
                  disabled={loggingOut}
                >
                  <Text style={styles.logoutText}>
                    {loggingOut ? "Logging out..." : "Log out"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
                  <Text style={styles.loginText}>Log in</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <UpgradeOverlay
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => handleUpgrade("premium")}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e9e9e9",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginBottom: 20,
  },
  // Current Plan
  currentPlanCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    padding: 16,
    marginBottom: 16,
  },
  currentPlanTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  currentPlanName: { fontSize: 15, color: "#111", marginBottom: 12 },
  currentPlanPrice: { color: "#666" },
  creditsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#e9e9e9",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  progressText: {
    fontSize: 13,
    color: "#666",
    minWidth: 40,
    textAlign: "right",
  },
  manageSubBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  manageSubText: { fontSize: 14, fontWeight: "500", color: "#111" },
  // Plan Card
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    padding: 16,
    marginBottom: 16,
  },
  planName: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 4 },
  planDesc: { fontSize: 13, color: "#666", marginBottom: 12, lineHeight: 18 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 8 },
  priceSymbol: { fontSize: 16, fontWeight: "600", color: "#3dcea5" },
  priceAmount: { fontSize: 32, fontWeight: "700", color: "#111" },
  priceInterval: { fontSize: 14, color: "#666", marginLeft: 4 },
  billingToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  billingLabel: { fontSize: 13, color: "#666" },
  upgradeBtn: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  upgradeBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  bookDemoBtn: {
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  bookDemoText: { fontSize: 14, fontWeight: "500", color: "#111" },
  creditsDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  creditsDropdownText: { fontSize: 13, color: "#666" },
  featuresHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  featureText: { fontSize: 13, color: "#666" },
  // Auth
  authSection: { marginTop: 20 },
  authMetaText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
    textAlign: "center",
  },
  loginBtn: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  loginText: { color: "#fff", fontWeight: "600" },
  logoutBtn: {
    backgroundColor: "#e03131",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "600" },
  // Overlay
  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  overlayContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  overlayClose: { position: "absolute", top: 12, right: 12, zIndex: 1 },
  overlayTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginBottom: 8,
    marginTop: 20,
  },
  overlaySub: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  overlayPlan: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    padding: 16,
  },
});

export default ProfileScreen;
