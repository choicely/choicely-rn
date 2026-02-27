import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import ScreenLayout from "../components/ScreenLayout";
import { createBridgeClient } from "../bridge/ChoicelyRNBridge";

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

// Mock data for development
const MOCK_USER_PLAN = {
  planType: "free", // 'free', 'premium', 'business'
  planName: "Free",
  creditsUsed: 2,
  creditsTotal: 5,
  monthlyPrice: null,
  billingPeriod: null,
  nextRenewal: null,
};

/**
 * Progress bar component for credits
 */
const CreditProgressBar = ({ used, total, color = "#3dcea5" }) => {
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {used}/{total}
      </Text>
    </View>
  );
};

/**
 * Feature list item with checkmark
 */
const FeatureItem = ({ label, color = "#3dcea5" }) => (
  <View style={styles.featureRow}>
    <Ionicons name="checkmark" size={16} color={color} />
    <Text style={styles.featureText}>{label}</Text>
  </View>
);

/**
 * Plan card component
 */
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
  isCurrentPlan,
  buttonLabel = "Upgrade",
  showBookDemo,
  onBookDemo,
}) => (
  <View style={[styles.planCard, isCurrentPlan && styles.planCardCurrent]}>
    <Text style={styles.planName}>{name}</Text>
    {description && <Text style={styles.planDescription}>{description}</Text>}

    {price !== undefined && (
      <View style={styles.priceRow}>
        <Text style={styles.priceSymbol}>€</Text>
        <Text style={styles.priceAmount}>{price}</Text>
        <Text style={styles.priceInterval}>/month</Text>
      </View>
    )}

    {onToggleAnnual !== undefined && (
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
      <TouchableOpacity style={styles.bookDemoButton} onPress={onBookDemo}>
        <Text style={styles.bookDemoText}>Book a demo</Text>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        style={[
          styles.upgradeButton,
          isCurrentPlan && styles.upgradeButtonDisabled,
        ]}
        onPress={onUpgrade}
        disabled={isCurrentPlan}
      >
        <Text
          style={[
            styles.upgradeText,
            isCurrentPlan && styles.upgradeTextDisabled,
          ]}
        >
          {isCurrentPlan ? "Current plan" : buttonLabel}
        </Text>
      </TouchableOpacity>
    )}

    {creditsLabel && (
      <TouchableOpacity style={styles.creditsDropdown}>
        <Text style={styles.creditsDropdownText}>{creditsLabel}</Text>
        <Ionicons name="chevron-down" size={16} color="#666" />
      </TouchableOpacity>
    )}

    <Text style={styles.featuresHeader}>{featureHeader}</Text>
    {features.map((feature, index) => (
      <FeatureItem key={index} label={feature} />
    ))}
  </View>
);

/**
 * Current plan summary card
 */
const CurrentPlanCard = ({
  planName,
  monthlyPrice,
  creditsUsed,
  creditsTotal,
  onManageSubscription,
  isPaid,
}) => (
  <View style={styles.currentPlanCard}>
    <Text style={styles.currentPlanTitle}>Your current plan:</Text>
    <View style={styles.currentPlanRow}>
      <Text style={styles.currentPlanName}>
        {planName}
        {monthlyPrice && (
          <Text style={styles.currentPlanPrice}> {monthlyPrice}€/month</Text>
        )}
      </Text>
    </View>

    <Text style={styles.creditsLabel}>Credits remaining</Text>
    <CreditProgressBar used={creditsUsed} total={creditsTotal} />

    {isPaid && (
      <TouchableOpacity
        style={styles.manageSubButton}
        onPress={onManageSubscription}
      >
        <Text style={styles.manageSubText}>Manage subscription</Text>
      </TouchableOpacity>
    )}
  </View>
);

/**
 * Upgrade overlay modal
 */
const UpgradeOverlay = ({ visible, onClose, onUpgrade }) => {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlayBackdrop}>
        <View style={styles.overlayContent}>
          <TouchableOpacity style={styles.overlayClose} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          <Text style={styles.overlayTitle}>Daily limit reached</Text>
          <Text style={styles.overlaySubtitle}>
            You've used today's free credits. Upgrade to keep building.
          </Text>

          <View style={styles.overlayPlan}>
            <Text style={styles.planName}>Premium</Text>
            <Text style={styles.planDescription}>
              Designed for fast-moving teams building together in real time.
            </Text>

            <View style={styles.priceRow}>
              <Text style={styles.priceSymbol}>€</Text>
              <Text style={styles.priceAmount}>25</Text>
              <Text style={styles.priceInterval}>/month</Text>
            </View>

            <View style={styles.billingToggle}>
              <Switch
                value={isAnnual}
                onValueChange={setIsAnnual}
                trackColor={{ false: "#ccc", true: "#3dcea5" }}
                thumbColor="#fff"
              />
              <Text style={styles.billingLabel}>Annual billing</Text>
            </View>

            <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
              <Text style={styles.upgradeText}>Upgrade</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.creditsDropdown}>
              <Text style={styles.creditsDropdownText}>
                1000 credits / month
              </Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>

            <Text style={styles.featuresHeader}>
              All features in Free, plus:
            </Text>
            {FREE_FEATURES.map((feature, index) => (
              <FeatureItem key={index} label={feature} />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Manage subscription view
 */
const ManageSubscriptionView = ({
  plan,
  onBack,
  onManagePayment,
  onChangeSubscription,
}) => (
  <ScreenLayout title="Choicely" canGoBack={true} onBack={onBack}>
    <View style={styles.container}>
      <TouchableOpacity style={styles.backLink} onPress={onBack}>
        <Ionicons name="chevron-back" size={16} color="#111" />
        <Text style={styles.backLinkText}>Back to Plans & Credits</Text>
      </TouchableOpacity>

      <Text style={styles.pageTitle}>Manage subscription</Text>

      <View style={styles.subscriptionCard}>
        <Text style={styles.subscriptionLabel}>Your current plan</Text>

        <View style={styles.subscriptionRow}>
          <Text style={styles.subscriptionKey}>Monthly credits</Text>
          <Text style={styles.subscriptionValue}>100</Text>
        </View>
        <View style={styles.subscriptionRow}>
          <Text style={styles.subscriptionKey}>Monthly price</Text>
          <Text style={styles.subscriptionValue}>16€</Text>
        </View>
        <View style={styles.subscriptionRow}>
          <Text style={styles.subscriptionKey}>Billing period</Text>
          <Text style={styles.subscriptionValue}>Annually</Text>
        </View>
        <View style={styles.subscriptionRow}>
          <Text style={styles.subscriptionKey}>Next renewal</Text>
          <Text style={styles.subscriptionValue}>1.1.20016</Text>
        </View>
        <View style={styles.subscriptionRow}>
          <Text style={styles.subscriptionKey}>Next payment</Text>
          <Text style={styles.subscriptionValue}>192€</Text>
        </View>

        <TouchableOpacity
          style={styles.managePaymentButton}
          onPress={onManagePayment}
        >
          <Text style={styles.managePaymentText}>Manage payment methods</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.changeSubButton}
          onPress={onChangeSubscription}
        >
          <Text style={styles.changeSubText}>Change subscription</Text>
        </TouchableOpacity>
      </View>
    </View>
  </ScreenLayout>
);

/**
 * Main Plans & Credits Screen
 */
const PlansCreditsScreen = ({ navigation }) => {
  const bridge = useMemo(() => createBridgeClient(), []);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState(MOCK_USER_PLAN);
  const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false);
  const [showManageSubscription, setShowManageSubscription] = useState(false);
  const [premiumAnnual, setPremiumAnnual] = useState(true);
  const [businessAnnual, setBusinessAnnual] = useState(true);

  useEffect(() => {
    // Simulating API call to fetch user plan
    const loadPlan = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch('/api/user/plan');
        // const data = await response.json();
        // setUserPlan(data);
        setUserPlan(MOCK_USER_PLAN);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load plan:", error);
        setLoading(false);
      }
    };

    loadPlan();
    return () => bridge.destroy();
  }, [bridge]);

  const handleUpgrade = useCallback((planType) => {
    console.log("Upgrade to:", planType);
    // TODO: Implement upgrade flow
  }, []);

  const handleManageSubscription = useCallback(() => {
    setShowManageSubscription(true);
  }, []);

  const handleBookDemo = useCallback(() => {
    console.log("Book demo clicked");
    // TODO: Implement book demo flow
  }, []);

  const isPaidPlan = userPlan.planType !== "free";

  if (showManageSubscription) {
    return (
      <ManageSubscriptionView
        plan={userPlan}
        onBack={() => setShowManageSubscription(false)}
        onManagePayment={() => console.log("Manage payment")}
        onChangeSubscription={() => console.log("Change subscription")}
      />
    );
  }

  return (
    <ScreenLayout
      title="Choicely"
      canGoBack={navigation?.canGoBack}
      onBack={navigation?.goBack}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.pageTitle}>Plans & Credits</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#111" />
          </View>
        ) : (
          <>
            {/* Current Plan Card */}
            <CurrentPlanCard
              planName={userPlan.planName}
              monthlyPrice={userPlan.monthlyPrice}
              creditsUsed={userPlan.creditsUsed}
              creditsTotal={userPlan.creditsTotal}
              onManageSubscription={handleManageSubscription}
              isPaid={isPaidPlan}
            />

            {/* Plan Cards */}
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

            <PlanCard
              name="Enterprise"
              description="Built for large organisations needing flexibility, scale, and governance."
              showBookDemo={true}
              onBookDemo={handleBookDemo}
              features={ENTERPRISE_FEATURES}
              featureHeader="All features in Premium, plus:"
            />
          </>
        )}
      </ScrollView>

      {/* Upgrade Overlay */}
      <UpgradeOverlay
        visible={showUpgradeOverlay}
        onClose={() => setShowUpgradeOverlay(false)}
        onUpgrade={() => handleUpgrade("premium")}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginBottom: 20,
  },
  // Current Plan Card
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
  currentPlanRow: {
    marginBottom: 12,
  },
  currentPlanName: {
    fontSize: 15,
    color: "#111",
  },
  currentPlanPrice: {
    color: "#666",
  },
  creditsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  // Progress Bar
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#e9e9e9",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: "#666",
    minWidth: 40,
    textAlign: "right",
  },
  manageSubButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  manageSubText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111",
  },
  // Plan Card
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    padding: 16,
    marginBottom: 16,
  },
  planCardCurrent: {
    borderColor: "#3dcea5",
    borderWidth: 2,
  },
  planName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  priceSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3dcea5",
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111",
  },
  priceInterval: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  billingToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  billingLabel: {
    fontSize: 13,
    color: "#666",
  },
  upgradeButton: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  upgradeButtonDisabled: {
    backgroundColor: "#e9e9e9",
  },
  upgradeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  upgradeTextDisabled: {
    color: "#999",
  },
  bookDemoButton: {
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  bookDemoText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111",
  },
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
  creditsDropdownText: {
    fontSize: 13,
    color: "#666",
  },
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
  featureText: {
    fontSize: 13,
    color: "#666",
  },
  // Subscription Management
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  backLinkText: {
    fontSize: 13,
    color: "#111",
  },
  subscriptionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    padding: 16,
  },
  subscriptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginBottom: 16,
  },
  subscriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  subscriptionKey: {
    fontSize: 14,
    color: "#666",
  },
  subscriptionValue: {
    fontSize: 14,
    color: "#111",
    fontWeight: "500",
  },
  managePaymentButton: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 12,
  },
  managePaymentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  changeSubButton: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  changeSubText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111",
  },
  // Overlay
  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  overlayContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  overlayClose: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1,
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginBottom: 8,
    marginTop: 20,
  },
  overlaySubtitle: {
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

export default PlansCreditsScreen;
