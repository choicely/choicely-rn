import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from "react-native";
import AppHistory from "./AppHistory";
import ChatInput from "./ChatInput";
import { useIconFontStatus } from "../lib/vector-icons/hooks";
import Ionicons from "react-native-vector-icons/Ionicons";
import { getMMKV } from "../state/mmkv";
import { createBridgeClient } from "../bridge/ChoicelyRNBridge";

const PENDING_MESSAGE_KEY = "choicely_pending_chat_message";

const getStorage = () => getMMKV();

export default function Dashboard({
  onSendMessage,
  onAppSwitch,
  history,
  inputText,
  onInputTextChange,
  scrollToApps = false,
  onOpenContextMenu,
  historyRefreshToken = 0,
}) {
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [localInputText, setLocalInputText] = useState("");
  const bridgeRef = useRef(null);
  const scrollRef = useRef(null);
  const isControlled = typeof onInputTextChange === "function";
  const resolvedInputText = isControlled ? (inputText ?? "") : localInputText;
  const updateInputText = isControlled ? onInputTextChange : setLocalInputText;
  const ioniconsReady = useIconFontStatus("Ionicons") === "ready";

  React.useEffect(() => {
    return () => {
      if (bridgeRef.current) {
        bridgeRef.current.destroy();
        bridgeRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (!scrollToApps) return;
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(id);
  }, [scrollToApps]);

  const getBridge = () => {
    if (!bridgeRef.current) {
      bridgeRef.current = createBridgeClient();
    }
    return bridgeRef.current;
  };

  // Check auth when user taps the input
  const handleInputFocus = async () => {
    if (isAuthChecked) return;

    try {
      const bridge = getBridge();
      const { isLoggedIn, isAnonymous } = await bridge.request(
        "choicely:auth:checkLogin"
      );

      if (isLoggedIn && !isAnonymous) {
        setIsAuthChecked(true);
      } else {
        await bridge.request("choicely:auth:openLogin");
      }
    } catch (error) {
      console.error("[Dashboard] Auth check failed:", error);
      setIsAuthChecked(false);
    }
  };

  const handleSend = async (text) => {
    console.log("[Dashboard] handleSend called, text:", text);
    if (!text?.trim()) return;

    try {
      const bridge = getBridge();
      const { isLoggedIn, isAnonymous } = await bridge.request(
        "choicely:auth:checkLogin"
      );

      if (isLoggedIn && !isAnonymous) {
        onSendMessage(text);
      } else {
        getStorage().set(PENDING_MESSAGE_KEY, text);
        await bridge.request("choicely:auth:openLogin");
      }
    } catch (error) {
      console.error("[Dashboard] Auth check failed:", error);
      setIsAuthChecked(false);
    }
  };

  const handlePlusPress = () => {
    if (onOpenContextMenu) {
      onOpenContextMenu();
    }
  };

  const handleScanQrPress = async () => {
    try {
      const bridge = getBridge();
      await bridge.request("choicely:navigation", {
        inner_navigation: "choicely://open_qr",
      });
    } catch (err) {
      console.error("QR Scan failed:", err);
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Describe App Section */}
      <View style={styles.section}>
        <Text style={styles.headerTitle}>Describe your mobile app</Text>
        <Text style={styles.subTitle}>
          Create mobile apps by chatting with AI
        </Text>

        <View style={styles.inputBoxWrapper}>
          <ChatInput
            variant="large"
            placeholder="Ask Choicely AI"
            value={resolvedInputText}
            onChangeText={updateInputText}
            onSend={handleSend}
            onPlusPress={handlePlusPress}
            disabled={!isAuthChecked}
          />
          {!isAuthChecked && (
            <Pressable
              style={styles.authOverlay}
              onPress={handleInputFocus}
              accessibilityRole="button"
              accessibilityLabel="Open login"
            />
          )}
        </View>
      </View>

      <Text style={styles.orText}>Or scan a QR code to launch</Text>

      {/* QR Code Section */}
      <TouchableOpacity style={styles.qrCard} onPress={handleScanQrPress}>
        <View style={styles.qrIconPlaceholder}>
          {ioniconsReady ? (
            <Ionicons name="qr-code-outline" size={24} color="#000" />
          ) : (
            <Text style={styles.qrFallback}>QR</Text>
          )}
        </View>
        <View style={styles.qrContent}>
          <Text style={styles.cardTitle}>Scan QR Code</Text>
          <Text style={styles.cardDesc}>
            Preview your app by scanning the QR code in studio.choicely.com
          </Text>
        </View>
      </TouchableOpacity>

      {/* My Apps Section */}
      <View style={styles.appsSection}>
        <AppHistory
          scrollEnabled={false}
          renderHeader={() => <Text style={styles.sectionHeader}>My apps</Text>}
          onAppSelect={onAppSwitch}
          isDashboard={true}
          refreshToken={historyRefreshToken}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    alignItems: "center",
    padding: 16,
  },
  section: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  subTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  inputBoxWrapper: {
    width: "100%",
    position: "relative",
  },
  authOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  orText: {
    color: "#666",
    marginBottom: 20,
  },
  qrCard: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 16,
    alignItems: "center",
    marginBottom: 30,
  },
  qrIconPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  qrFallback: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111",
  },
  qrContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  appsSection: {
    width: "100%",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 16,
  },
});
