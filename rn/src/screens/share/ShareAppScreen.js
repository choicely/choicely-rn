import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
  ScrollView,
  SafeAreaView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

/**
 * Menu Item Component for share options
 */
const ShareMenuItem = ({ icon, title, onPress }) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.menuItemIcon}>
      <Ionicons name={icon} size={22} color="#111" />
    </View>
    <Text style={styles.menuItemTitle}>{title}</Text>
    <Ionicons name="chevron-forward" size={20} color="#999" />
  </TouchableOpacity>
);

/**
 * Share App Screen Component
 * Displays sharing options for the current app
 */
const ShareAppScreen = ({
  appTitle = "My App",
  appDescription = "Short description",
  appIconUrl,
  heroImageUrl,
  previewLink,
  onCopyLink,
  onInvitePeople,
  onManagePeople,
  onPublish,
  onClose,
}) => {
  const handleCopyLink = () => {
    if (onCopyLink) {
      onCopyLink(previewLink);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.header}>Share</Text>

        {/* Hero Card with App Preview */}
        <View style={styles.heroCard}>
          <ImageBackground
            source={heroImageUrl ? { uri: heroImageUrl } : undefined}
            style={styles.heroBackground}
            imageStyle={styles.heroImage}
            resizeMode="cover"
          >
            {/* Fallback gradient if no image */}
            {!heroImageUrl && <View style={styles.heroGradient} />}

            {/* App Info Overlay */}
            <View style={styles.heroOverlay}>
              <View style={styles.appInfo}>
                {appIconUrl ? (
                  <Image source={{ uri: appIconUrl }} style={styles.appIcon} />
                ) : (
                  <View style={styles.appIconPlaceholder}>
                    <Ionicons name="apps" size={20} color="#fff" />
                  </View>
                )}
                <View style={styles.appText}>
                  <Text style={styles.appTitle} numberOfLines={1}>
                    {appTitle}
                  </Text>
                  <Text style={styles.appDescription} numberOfLines={1}>
                    {appDescription}
                  </Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Copy Preview Link Button */}
        <TouchableOpacity
          style={styles.copyButton}
          onPress={handleCopyLink}
          activeOpacity={0.8}
        >
          <Ionicons name="share-outline" size={20} color="#fff" />
          <Text style={styles.copyButtonText}>Copy preview link</Text>
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <ShareMenuItem
            icon="person-add-outline"
            title="Invite people"
            onPress={onInvitePeople}
          />
          <ShareMenuItem
            icon="people-outline"
            title="Manage people"
            onPress={onManagePeople}
          />
          <ShareMenuItem
            icon="cloud-upload-outline"
            title="Publish your App"
            onPress={onPublish}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 24,
  },
  // Hero Card
  heroCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  heroBackground: {
    height: 180,
    justifyContent: "flex-end",
  },
  heroImage: {
    borderRadius: 16,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#333",
    opacity: 0.8,
  },
  heroOverlay: {
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  appInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  appIconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  appText: {
    flex: 1,
  },
  appTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },
  appDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  // Copy Button
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#111",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignSelf: "center",
    marginBottom: 28,
  },
  copyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  // Menu Items
  menuContainer: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuItemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#111",
  },
});

export default ShareAppScreen;
