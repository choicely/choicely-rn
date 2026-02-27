import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Image,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { BACKEND_URL } from "../../services/ChoicelyApiService";
import ScreenLayout from "../../components/ScreenLayout";

const buildImageUrl = (imageKey) =>
  imageKey ? `${BACKEND_URL}/images/${imageKey}/serve/` : null;

const TemplateDetailScreen = ({
  template,
  onBack,
  onUseTemplate,
  useTemplateLoading = false,
  useTemplateError = null,
  canGoBack = false,
  createdApp = null,
  onOpenPreview,
}) => {
  const previewImageUrl = buildImageUrl(template.heroImageKey);
  const iconUrl = buildImageUrl(template.iconKey);
  const previewThumbs = template.thumbImageKeys.length
    ? template.thumbImageKeys
    : [null, null, null];
  const articleText = template.articleText || template.description;

  return (
    <ScreenLayout
      title={template.title || "Template"}
      canGoBack={canGoBack}
      onBack={onBack}
      showLogo={true}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.detailContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailHeroContainer}>
          {previewImageUrl ? (
            <ImageBackground
              source={{ uri: previewImageUrl }}
              style={styles.detailHeroFull}
              imageStyle={styles.detailHeroFullInner}
            />
          ) : (
            <View
              style={[styles.detailHeroFull, styles.detailHeroPlaceholder]}
            />
          )}
        </View>

        {/* Info card with icon, title, description, and button */}
        <View style={styles.detailInfoCard}>
          <View style={styles.detailIconWrap}>
            {iconUrl ? (
              <Image source={{ uri: iconUrl }} style={styles.detailIconImage} />
            ) : (
              <View
                style={[
                  styles.detailIconFallback,
                  { backgroundColor: template.accent },
                ]}
              />
            )}
          </View>
          <View style={styles.detailInfoContent}>
            <View style={styles.detailInfoText}>
              <Text style={styles.detailTitle}>{template.title}</Text>
              <Text style={styles.detailSubtitle}>{template.description}</Text>
            </View>
            {createdApp ? (
              <TouchableOpacity
                style={[styles.detailButton, styles.detailButtonSuccess]}
                onPress={onOpenPreview}
                activeOpacity={0.7}
              >
                <Text style={styles.detailButtonText}>Open Preview</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.detailButton,
                  useTemplateLoading && styles.detailButtonDisabled,
                ]}
                onPress={() => onUseTemplate?.(template.key, template.title)}
                disabled={useTemplateLoading}
                activeOpacity={0.7}
              >
                {useTemplateLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.detailButtonText}>Use Template</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Error message */}
        {useTemplateError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#c92a2a" />
            <Text style={styles.errorText}>{useTemplateError}</Text>
          </View>
        ) : null}

        {/* Article text */}
        {articleText ? (
          <Text style={styles.detailBody}>{articleText}</Text>
        ) : null}

        {/* Preview section */}
        <Text style={styles.previewSectionTitle}>Preview</Text>
        <View style={styles.deviceToggleRow}>
          <View style={styles.deviceChipActive}>
            <Ionicons name="phone-portrait" size={14} color="#111" />
            <Text style={styles.deviceChipText}>Phone</Text>
          </View>
          <View style={styles.deviceChip}>
            <Ionicons name="tablet-portrait" size={14} color="#777" />
          </View>
        </View>
        <View style={styles.previewThumbRow}>
          {previewThumbs.map((thumbKey, index) => {
            const thumbUrl = buildImageUrl(thumbKey);
            return (
              <View key={`detail-thumb-${index}`} style={styles.detailThumb}>
                {thumbUrl ? (
                  <Image
                    source={{ uri: thumbUrl }}
                    style={styles.previewThumbImage}
                  />
                ) : (
                  <View style={styles.previewThumbPlaceholder} />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  detailContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  // Hero section
  detailHeroContainer: {
    overflow: "hidden",
  },
  detailHeroFull: {
    height: 220,
    justifyContent: "flex-start",
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  detailHeroFullInner: {},
  detailHeroPlaceholder: {
    backgroundColor: "#e0e0e0",
  },
  // Info card
  detailInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailInfoContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f1f3f5",
    alignItems: "center",
    justifyContent: "center",
  },
  detailIconImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  detailIconFallback: {
    width: "100%",
    height: "100%",
  },
  detailInfoText: {
    flex: 1,
    minWidth: 0,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  detailSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  detailButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#111",
    minWidth: 128,
    justifyContent: "center",
    flexShrink: 0,
  },
  detailButtonDisabled: {
    backgroundColor: "#666",
  },
  detailButtonSuccess: {
    backgroundColor: "#22c55e",
  },
  detailButtonIcon: {
    marginRight: 4,
  },
  detailButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff5f5",
    borderRadius: 8,
  },
  errorText: {
    color: "#c92a2a",
    fontSize: 12,
    flex: 1,
  },
  // Article body
  detailBody: {
    marginTop: 14,
    fontSize: 13,
    color: "#3d3d3d",
    lineHeight: 19,
  },
  // Preview section
  previewSectionTitle: {
    marginTop: 22,
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  deviceToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  deviceChipActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#f1f3f5",
  },
  deviceChipText: {
    fontSize: 12,
    color: "#111",
    fontWeight: "600",
  },
  deviceChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f1f3f5",
    alignItems: "center",
    justifyContent: "center",
  },
  previewThumbRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  detailThumb: {
    flex: 1,
    height: 150,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#f6d35c",
  },
  previewThumbImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  previewThumbPlaceholder: {
    flex: 1,
    backgroundColor: "#f6d35c",
  },
});

export default TemplateDetailScreen;

