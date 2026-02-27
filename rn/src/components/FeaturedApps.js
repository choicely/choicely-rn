import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import ScreenLayout from "./ScreenLayout";

const featuredItems = [
  {
    id: "eurovision",
    label: "EUROVISION APP",
    title: "Template name",
    subtitle: "Short description",
    accent: "#ff4d6d",
    image:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "miss-international",
    label: "MISS INTERNATIONAL",
    title: "Template name",
    subtitle: "Short description",
    accent: "#e03131",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "night-show",
    label: "NIGHT SHOW",
    title: "Template name",
    subtitle: "Short description",
    accent: "#343a40",
    image:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
  },
];

const FeaturedApps = () => {
  return (
    <ScreenLayout title="Choicely" showLogo={true}>
      <View style={styles.container}>
        <View style={styles.tabs}>
          <Text style={[styles.tab, styles.tabMuted]}>Discover templates</Text>
          <Text style={[styles.tab, styles.tabActive]}>Featured Apps</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {featuredItems.map((item) => (
            <View key={item.id} style={styles.card}>
              <ImageBackground
                source={{ uri: item.image }}
                style={styles.cardImage}
                imageStyle={styles.cardImageInner}
              >
                <View style={styles.cardLabel}>
                  <Text style={styles.cardLabelText}>{item.label}</Text>
                </View>
                <View style={styles.cardOverlay}>
                  <View
                    style={[styles.cardIcon, { backgroundColor: item.accent }]}
                  >
                    <Ionicons name="heart" size={18} color="#111" />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
              </ImageBackground>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  tabs: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabMuted: {
    color: "#8c8c8c",
  },
  tabActive: {
    color: "#111",
    borderBottomWidth: 2,
    borderBottomColor: "#111",
    paddingBottom: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#111",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardImage: {
    height: 200,
    justifyContent: "flex-end",
  },
  cardImageInner: {
    resizeMode: "cover",
  },
  cardLabel: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardLabelText: {
    color: "#fff",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  cardOverlay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: "#d0d0d0",
    fontSize: 12,
    marginTop: 2,
  },
});

export default FeaturedApps;
