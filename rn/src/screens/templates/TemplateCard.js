import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import TemplateIcon from "./TemplateIcon";
import { BACKEND_URL } from "../../services/ChoicelyApiService";

const buildImageUrl = (imageKey) =>
  imageKey ? `${BACKEND_URL}/images/${imageKey}/serve/` : null;

const TemplateCard = ({ item, onPress }) => {
  const cardImageUrl = buildImageUrl(item.heroImageKey);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {cardImageUrl ? (
        <ImageBackground
          source={{ uri: cardImageUrl }}
          style={styles.cardImage}
          imageStyle={styles.cardImageInner}
        >
          <View style={styles.cardOverlay}>
            <TemplateIcon
              iconKey={item.iconKey}
              accent={item.accent}
              style={styles.cardIcon}
              imageStyle={styles.cardIconImage}
            />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.description}</Text>
            </View>
          </View>
        </ImageBackground>
      ) : (
        <View style={[styles.cardImage, styles.cardPlaceholder]}>
          <View style={styles.cardOverlay}>
            <TemplateIcon
              iconKey={item.iconKey}
              accent={item.accent}
              style={styles.cardIcon}
              imageStyle={styles.cardIconImage}
            />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.description}</Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#111",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
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
  cardPlaceholder: {
    backgroundColor: "#e9ecef",
  },
  cardOverlay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 10,
  },
  cardIconImage: {
    borderRadius: 8,
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
    color: "#d7d7d7",
    fontSize: 11,
  },
});

export default TemplateCard;
