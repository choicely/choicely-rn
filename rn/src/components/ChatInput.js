import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  Animated,
  Linking,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useIconFontStatus } from "../lib/vector-icons/hooks";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** URL regex — matches http(s)://, www., or bare domains like bbc.com */
const URL_REGEX =
  /(?:https?:\/\/[\S]+|www\.[\S]+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+(?:com|org|net|io|co|dev|app|me|info|biz|edu|gov|uk|fi|de|fr|se|no|dk|nl|es|it|pt|ru|jp|cn|au|ca|in|br|za)\b(?:\/[\S]*)?)/i;

/** Extract domain from a URL string */
const getDomain = (url) => {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/* ------------------------------------------------------------------ */
/*  Skeleton pulse — pure RN Animated, no extra deps                  */
/* ------------------------------------------------------------------ */
const SkeletonPulse = ({ style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[style, { opacity }]} />;
};

/* ------------------------------------------------------------------ */
/*  URL preview card — shown OUTSIDE the input bubble                 */
/* ------------------------------------------------------------------ */
const UrlPreviewCard = ({ url, onClear, onPress }) => {
  const domain = getDomain(url);
  const displayUrl = url.length > 50 ? url.slice(0, 47) + "..." : url;

  return (
    <View style={styles.urlCard}>
      <TouchableOpacity
        style={styles.urlCardContent}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.urlCardIcon}>
          <Ionicons name="globe-outline" size={18} color="#6B7280" />
        </View>
        <View style={styles.urlCardTextGroup}>
          <Text style={styles.urlCardDomain} numberOfLines={1}>
            {domain}
          </Text>
          <Text style={styles.urlCardUrl} numberOfLines={1}>
            {displayUrl}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.urlCardClose}
        onPress={onClear}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name="close" size={14} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
};

/**
 * Chat Input Component
 * Props:
 * - onSend: Called when user sends a message
 * - onPlusPress: Called when + button is pressed (opens context menu)
 * - onMicPress: Called when microphone button is pressed
 * - disabled: Disables input and send
 * - placeholder: Input placeholder text
 * - value/onChangeText: Controlled input (optional)
 * - contextLabel: Optional context pill text (e.g., brand name)
 * - contextAttachment: Optional attachment object ({ type, url, ... })
 * - onClearContext: Called when X button clears context
 * - onUrlDetected: Called with { url } when a URL is auto-detected in input
 * - variant: 'compact' (default) or 'large' for dashboard
 */
function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask Choicely AI",
  value,
  onChangeText,
  onPlusPress,
  onMicPress,
  contextLabel,
  contextAttachment,
  onClearContext,
  onUrlDetected,
  variant = "compact",
}) {
  const [internalInput, setInternalInput] = useState("");
  const input = value != null ? value : internalInput;
  const setInput = onChangeText || setInternalInput;
  const isLarge = variant === "large";
  const ioniconsReady = useIconFontStatus("Ionicons") === "ready";
  const materialIconsReady = useIconFontStatus("MaterialIcons") === "ready";
  const hasContext = Boolean(contextLabel);
  const isContextLoading = contextLabel === "Attaching context...";
  const lastDetectedUrlRef = useRef(null);

  /* ---- Auto-detect URLs in input ---- */
  const handleTextChange = useCallback(
    (text) => {
      setInput(text);

      // Don't auto-detect if we already have context attached
      if (hasContext || !onUrlDetected) return;

      const trimmed = text.trim();
      if (!trimmed) return;

      // Only trigger when the URL is followed by a delimiter (space/newline/tab),
      // so we don't attach early while the user is still typing the domain.
      const tokens = trimmed.split(/\s+/);
      const lastToken = tokens[tokens.length - 1];
      const urlInLastToken = lastToken.match(URL_REGEX);

      // If the last token is a URL, only trigger if there's trailing whitespace
      // (meaning the user confirmed it with space/newline/tab).
      const hasTrailingSpace = text.length > 0 && /\s$/.test(text);

      if (urlInLastToken && hasTrailingSpace) {
        const detectedUrl = urlInLastToken[0];
        if (lastDetectedUrlRef.current !== detectedUrl) {
          lastDetectedUrlRef.current = detectedUrl;
          const normalized = detectedUrl.startsWith("http")
            ? detectedUrl
            : `https://${detectedUrl}`;
          onUrlDetected({ url: normalized });
          const remaining = trimmed.replace(detectedUrl, "").trim();
          requestAnimationFrame(() => setInput(remaining));
        }
      } else {
        lastDetectedUrlRef.current = null;
      }
    },
    [setInput, hasContext, onUrlDetected]
  );

  // Reset lastDetectedUrl when context is cleared
  useEffect(() => {
    if (!hasContext) {
      lastDetectedUrlRef.current = null;
    }
  }, [hasContext]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input);
      setInput("");
      lastDetectedUrlRef.current = null;
    }
  };

  const hasInput = input.trim().length > 0;
  const isUrlContext = contextAttachment?.type === "url";

  /* ---------------------------------------------------------------- */
  /*  Attachment preview (above input row, INSIDE bubble)             */
  /*  Only for non-URL attachments. URL is rendered outside.          */
  /* ---------------------------------------------------------------- */
  const renderAttachmentPreview = () => {
    if (!hasContext || isUrlContext) return null;

    // --- Loading skeleton ---
    if (isContextLoading) {
      return (
        <View style={styles.attachmentArea}>
          <View style={styles.skeletonWrapper}>
            <SkeletonPulse style={styles.skeletonThumbnail} />
            <View style={styles.skeletonTextGroup}>
              <SkeletonPulse style={styles.skeletonLine} />
              <SkeletonPulse style={styles.skeletonLineShort} />
            </View>
          </View>
        </View>
      );
    }

    // --- Image attachment ---
    if (contextAttachment?.type === "image" && contextAttachment?.url) {
      return (
        <View style={styles.attachmentArea}>
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: contextAttachment.url }}
              style={styles.thumbnail}
            />
            <TouchableOpacity
              style={styles.thumbnailBadge}
              onPress={onClearContext}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {ioniconsReady ? (
                <Ionicons name="close" size={10} color="#fff" />
              ) : (
                <Text style={styles.badgeFallback}>×</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // --- File / generic attachment ---
    return (
      <View style={styles.attachmentArea}>
        <View style={styles.pillContainer}>
          <View style={styles.pillContent}>
            {ioniconsReady && (
              <Ionicons
                name="document-outline"
                size={14}
                color="#555"
                style={styles.pillIcon}
              />
            )}
            <Text style={styles.pillText} numberOfLines={1}>
              {contextLabel}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.pillClose}
            onPress={onClearContext}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            {ioniconsReady ? (
              <Ionicons name="close" size={12} color="#888" />
            ) : (
              <Text style={styles.fallbackIconSmall}>×</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleUrlPress = useCallback(() => {
    const url = contextAttachment?.url;
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  }, [contextAttachment?.url]);

  return (
    <View
      style={[
        styles.inputWrapper,
        isLarge ? styles.inputWrapperLarge : { paddingHorizontal: 12 },
      ]}
    >
      {/* URL preview — rendered OUTSIDE the bubble */}
      {isUrlContext && contextAttachment?.url && (
        <UrlPreviewCard
          url={contextAttachment.url}
          onClear={onClearContext}
          onPress={handleUrlPress}
        />
      )}

      <View
        style={[styles.inputContainer, isLarge && styles.inputContainerLarge]}
      >
        {/* Non-URL attachment preview area (inside bubble) */}
        {renderAttachmentPreview()}

        {/* Top row for large variant */}
        {isLarge && (
          <TextInput
            style={[styles.input, styles.inputLarge]}
            placeholder={placeholder}
            placeholderTextColor="#999"
            value={input}
            onChangeText={handleTextChange}
            multiline
            editable={!disabled}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
        )}

        {/* Bottom row with buttons */}
        <View style={[styles.buttonRow, isLarge && styles.buttonRowLarge]}>
          {/* Plus button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onPlusPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {ioniconsReady ? (
              <Ionicons name="add" size={20} color="#666" />
            ) : (
              <Text style={styles.fallbackIcon}>+</Text>
            )}
          </TouchableOpacity>

          {/* Text input for compact variant */}
          {!isLarge && (
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="#999"
              value={input}
              onChangeText={handleTextChange}
              multiline
              editable={!disabled}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              returnKeyType="send"
            />
          )}

          {/* Spacer for large variant */}
          {isLarge && <View style={styles.spacer} />}

          {/* Microphone button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onMicPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {materialIconsReady ? (
              <MaterialIcons name="graphic-eq" size={20} color="#666" />
            ) : (
              <Text style={styles.fallbackIcon}>|||</Text>
            )}
          </TouchableOpacity>

          {/* Send button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              hasInput && !disabled && styles.sendButtonActive,
            ]}
            onPress={handleSend}
            disabled={disabled || !hasInput}
            activeOpacity={0.7}
          >
            {ioniconsReady ? (
              <Ionicons
                name="arrow-up"
                size={18}
                color={hasInput && !disabled ? "#fff" : "#666"}
              />
            ) : (
              <Text
                style={[
                  styles.fallbackIcon,
                  hasInput && !disabled
                    ? styles.fallbackIconOnDark
                    : styles.fallbackIconOnLight,
                ]}
              >
                ^
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ---- Wrapper & container ---- */
  inputWrapper: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
    paddingTop: 8,
    paddingBottom: 12,
  },
  inputWrapperLarge: {
    borderTopWidth: 0,
    padding: 0,
  },
  inputContainer: {
    flexDirection: "column",
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  inputContainerLarge: {
    borderRadius: 16,
    padding: 12,
    minHeight: 100,
  },

  /* ---- URL preview card (OUTSIDE the bubble) ---- */
  urlCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 6,
    marginBottom: 8,
  },
  urlCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  urlCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  urlCardTextGroup: {
    flex: 1,
  },
  urlCardDomain: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginBottom: 1,
  },
  urlCardUrl: {
    fontSize: 12,
    color: "#6B7280",
  },
  urlCardClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  /* ---- Attachment area (inside bubble, for non-URL) ---- */
  attachmentArea: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 6,
  },

  /* -- Image thumbnail with × badge -- */
  thumbnailContainer: {
    alignSelf: "flex-start",
    position: "relative",
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#E8E8E8",
  },
  thumbnailBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeFallback: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "700",
    lineHeight: 11,
  },

  /* -- Pill (file) -- */
  pillContainer: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 6,
    maxWidth: "85%",
  },
  pillContent: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  pillIcon: {
    marginRight: 4,
  },
  pillText: {
    fontSize: 13,
    color: "#444",
    flexShrink: 1,
  },
  pillClose: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  /* -- Skeleton loading -- */
  skeletonWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  skeletonThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  skeletonTextGroup: {
    marginLeft: 10,
    justifyContent: "center",
  },
  skeletonLine: {
    width: 100,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E5E7EB",
    marginBottom: 6,
  },
  skeletonLineShort: {
    width: 64,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E5E7EB",
  },

  /* ---- Button row ---- */
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonRowLarge: {
    marginTop: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },

  /* ---- Text input ---- */
  input: {
    flex: 1,
    minHeight: 32,
    maxHeight: 100,
    fontSize: 15,
    color: "#222",
    paddingVertical: 4,
    paddingHorizontal: 8,
    textAlignVertical: "center",
  },
  inputLarge: {
    flex: 1,
    minHeight: 50,
    textAlignVertical: "top",
    paddingHorizontal: 0,
  },

  /* ---- Send button ---- */
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  sendButtonActive: {
    backgroundColor: "#1A1A1A",
  },

  /* ---- Spacer ---- */
  spacer: {
    flex: 1,
  },

  /* ---- Fallback icons ---- */
  fallbackIcon: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
  },
  fallbackIconOnLight: {
    color: "#666",
  },
  fallbackIconOnDark: {
    color: "#fff",
  },
  fallbackIconSmall: {
    fontSize: 11,
    fontWeight: "700",
    color: "#666",
    lineHeight: 12,
  },
});

export default ChatInput;
