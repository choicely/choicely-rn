import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { getFormattedHoursMinutes, getFormattedDate } from "../utils/datetime";
import Ionicons from "react-native-vector-icons/Ionicons";

/**
 * CTA card component for "Your app is ready!" or "Changes are ready!" messages
 * Displays with green accent bar, title, subtitle, timestamp, and navigation arrow
 *
 * @param {string} title - Main title (e.g., "Your app is ready!")
 * @param {string} subtitle - Subtitle text (e.g., "Check out the new version")
 * @param {number|string} timestamp - Timestamp for display
 * @param {function} onPress - Callback when card is pressed
 * @param {function} onMenuPress - Callback for ... menu button
 * @param {'success'|'warning'|'info'} variant - Color variant for accent bar
 */
export default function AppReadyCard({
  title = "Your app is ready!",
  subtitle = "Tap to preview",
  timestamp,
  onPress,
  onMenuPress,
  variant = "success",
}) {
  const accentColor =
    {
      success: "#4F6BD9",
      warning: "#B7791F",
      info: "#2563EB",
    }[variant] || "#4F6BD9";

  const formattedTime = timestamp ? getFormattedHoursMinutes(timestamp) : "";
  const formattedDate = timestamp ? getFormattedDate(timestamp) : "";

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
        </View>

        <Text style={styles.subtitle}>{subtitle}</Text>

        {timestamp && (
          <View style={styles.metaRow}>
            <Text style={styles.timestamp}>{formattedTime}</Text>
            <View style={styles.dot} />
            <Text style={styles.timestamp}>{formattedDate}</Text>
          </View>
        )}
      </View>

      <View style={styles.rightSection}>
        <View style={styles.arrowCircle}>
          <Text style={styles.arrow}>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Text>
        </View>
      </View>

      {onMenuPress && (
        <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
          <Text style={styles.menuIcon}>•••</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    marginVertical: 10,
    overflow: "hidden",
    flexDirection: "row",
    minHeight: 84,
    borderWidth: 1,
    borderColor: "#C7D7FD",
    shadowColor: "#4F6BD9",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  accentBar: {
    width: 3,
    backgroundColor: "#4F6BD9",
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E2A5E",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    color: "#4A5899",
    marginTop: 6,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#E0E8FF",
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  timestamp: {
    fontSize: 11,
    color: "#6B7FC4",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#A0AEED",
    marginHorizontal: 6,
  },
  rightSection: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4F6BD9",
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: {
    fontSize: 20,
    color: "#fff",
  },
  menuButton: {
    position: "absolute",
    bottom: 8,
    left: 16,
    padding: 4,
  },
  menuIcon: {
    fontSize: 12,
    color: "#8896C8",
    letterSpacing: 2,
  },
});

