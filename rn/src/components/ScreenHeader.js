import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

const choicelyLogoAsset = require("../assets/choicely-logo.png");

const COLOR_PALETTE = [
  "#D15C5C",
  "#C96B30",
  "#B46B9B",
  "#6E7FC8",
  "#5D9C9E",
  "#5B8B5A",
  "#C4973D",
  "#8A6FB0",
];

const getInitial = (label) => {
  if (!label) return "";
  return label.trim().charAt(0).toUpperCase();
};

const hashColor = (label) => {
  if (!label) return COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) % 2147483647;
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
};

/**
 * A reusable screen header component with flexible left, center, and right slots.
 *
 * Props:
 * - title: string - The title to display
 * - canGoBack: boolean - Whether back button should be shown
 * - onBack: function - Callback when back button is pressed
 * - leftIcon: string - Custom left icon name (Ionicons), overrides back button
 * - onLeftPress: function - Callback for custom left button
 * - rightContent: ReactNode - Custom content for right slot
 * - showAppBadge: boolean - Show app initial badge instead of star
 * - badgeLabel: string - Label for badge (uses first letter)
 * - showLogo: boolean - Force showing Choicely logo
 * - centerContent: ReactNode - Custom center content (overrides title/badge)
 */
const ScreenHeader = ({
  title,
  canGoBack = false,
  onBack,
  leftIcon,
  onLeftPress,
  rightContent,
  showAppBadge = false,
  badgeLabel,
  showLogo = false,
  centerContent,
}) => {
  const displayTitle = title || "Choicely";
  const badgeText = useMemo(
    () => getInitial(badgeLabel || displayTitle),
    [badgeLabel, displayTitle]
  );
  const badgeColor = useMemo(
    () => hashColor(badgeLabel || displayTitle),
    [badgeLabel, displayTitle]
  );

  const showBack = Boolean(canGoBack && onBack) && !leftIcon;
  const showLeftIcon = Boolean(leftIcon && onLeftPress);
  const shouldShowAppBadge = showAppBadge;
  const showChoicelyLogo =
    showLogo || (!shouldShowAppBadge && displayTitle === "Choicely");

  const renderBrandContent = () => {
    if (showChoicelyLogo) {
      return (
        <View style={styles.logoWrap}>
          <Image
            source={choicelyLogoAsset}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      );
    }

    return (
      <>
        {shouldShowAppBadge ? (
          <View style={[styles.appBadge, { backgroundColor: badgeColor }]}>
            <Text style={styles.appBadgeText}>{badgeText}</Text>
          </View>
        ) : (
          <View style={styles.brandBadge}>
            <Ionicons name="star" size={14} color="#fff" />
          </View>
        )}
        <Text style={styles.title} numberOfLines={1}>
          {displayTitle}
        </Text>
      </>
    );
  };

  const renderLeftSlot = () => {
    if (showLeftIcon) {
      return (
        <TouchableOpacity
          style={styles.leftButton}
          onPress={onLeftPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={leftIcon} size={22} color="#111" />
        </TouchableOpacity>
      );
    }

    if (showBack) {
      return (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#111" />
        </TouchableOpacity>
      );
    }

    return null;
  };

  const hasLeftSlot = showBack || showLeftIcon;
  const isCentered = !hasLeftSlot && !rightContent;
  const shouldCenterLogoOverlay = showChoicelyLogo && !centerContent;

  return (
    <View style={styles.container}>
      {renderLeftSlot()}

      <View
        style={[
          styles.centerSlot,
          !hasLeftSlot && styles.centerSlotNoBack,
          isCentered && styles.centerSlotCentered,
        ]}
      >
        {centerContent || (shouldCenterLogoOverlay ? null : renderBrandContent())}
      </View>

      {rightContent ? (
        <View style={styles.rightSlot}>{rightContent}</View>
      ) : (
        isCentered && <View style={styles.spacer} />
      )}

      {shouldCenterLogoOverlay ? (
        <View pointerEvents="none" style={styles.logoCenteredOverlay}>
          {renderBrandContent()}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: "relative",
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  leftButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  centerSlot: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    minWidth: 0,
  },
  centerSlotNoBack: {
    paddingLeft: 2,
  },
  centerSlotCentered: {
    justifyContent: "center",
  },
  rightSlot: {
    marginLeft: "auto",
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: {
    width: 36,
  },
  appBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  appBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logoWrap: {
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 92,
    height: 24,
  },
  logoCenteredOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 56,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
});

export default ScreenHeader;
