import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AI_CHAT_LAYERS } from "./routes";

/**
 * Segmented toggle between Chat and Preview layers.
 *
 * Props:
 * - activeLayer: 'chat' | 'preview'  — which segment is currently selected
 * - onLayerChange(layer): called when user taps a segment
 * - previewEnabled: boolean — disables the preview segment when false
 */
const LayerToggle = ({ activeLayer, onLayerChange, previewEnabled }) => {
  // const isChatActive = activeLayer !== AI_CHAT_LAYERS.PREVIEW;
  const isChatActive = true;

  const handleChat = () => {
    if (!isChatActive) onLayerChange?.(AI_CHAT_LAYERS.CHAT);
  };

  const handlePreview = () => {
    if (isChatActive && previewEnabled) onLayerChange?.(AI_CHAT_LAYERS.PREVIEW);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePreview}>
      {/* Chat segment */}
      <View style={[styles.segment, isChatActive && styles.segmentActive]}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={15}
          color={isChatActive ? "#fff" : "#888"}
        />
      </View>

      {/* Preview segment */}
      <View
        style={[
          styles.segment,
          !isChatActive && styles.segmentActive,
          !previewEnabled && styles.segmentDisabled,
        ]}
      >
        <Ionicons
          name="phone-portrait-outline"
          size={15}
          color={!isChatActive ? "#fff" : previewEnabled ? "#888" : "#C0C0C0"}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#EFEFEF",
    borderRadius: 15,
    padding: 3,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 2,
  },
  segment: {
    width: 32,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: "#1A1A1A",
  },
  segmentDisabled: {
    opacity: 0.4,
  },
});

export default LayerToggle;

