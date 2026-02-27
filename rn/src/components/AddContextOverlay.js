import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Image,
  TextInput,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

// Menu views
const MENU_VIEWS = {
  MAIN: "main",
  THEMES: "themes",
  LAYOUTS: "layouts",
  URL: "url",
};

// Quick action buttons for top row
const QUICK_ACTIONS = [
  { id: "camera", icon: "camera-outline", label: "Camera" },
  { id: "photos", icon: "images-outline", label: "Photos" },
  { id: "files", icon: "document-outline", label: "Files" },
  { id: "url", icon: "link-outline", label: "URL" },
];

// Main menu items
const MENU_ITEMS = [
  {
    id: "themes",
    icon: "color-palette-outline",
    title: "Themes and layouts",
    subtitle: "Change how your whole app looks",
    navigateTo: MENU_VIEWS.THEMES,
  },
  {
    id: "push",
    icon: "notifications-outline",
    title: "Send push message",
    subtitle: "Send push messages for your users",
  },
  {
    id: "share",
    icon: "share-outline",
    title: "Share my app",
    subtitle: "Show people what you've created",
  },
];

// Mock theme data
const THEMES = [
  {
    id: "current",
    name: "Current theme",
    colors: ["#4ce2a7", "#339af0", "#845ef7", "#f06595", "#ff922b"],
  },
  {
    id: "orange",
    name: "Orange",
    colors: ["#ff922b", "#fd7e14", "#e8590c", "#d9480f"],
  },
  {
    id: "green",
    name: "Green",
    colors: ["#4ce2a7", "#20c997", "#12b886", "#0ca678"],
  },
  {
    id: "fuchsia",
    name: "Fuchsia",
    colors: ["#f06595", "#e64980", "#d6336c", "#c2255c"],
  },
];

// Mock layout data
const LAYOUTS = [
  { id: "layout1", thumbnail: null },
  { id: "layout2", thumbnail: null },
  { id: "layout3", thumbnail: null },
  { id: "layout4", thumbnail: null },
  { id: "layout5", thumbnail: null },
  { id: "layout6", thumbnail: null },
];

/**
 * Quick Action Button Component
 */
const QuickActionButton = ({ icon, label, onPress }) => (
  <TouchableOpacity
    style={styles.quickAction}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.quickActionIcon}>
      <Ionicons name={icon} size={24} color="#111" />
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

/**
 * Menu Item Component
 */
const MenuItem = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.menuItemIcon}>
      <Ionicons name={icon} size={22} color="#111" />
    </View>
    <View style={styles.menuItemText}>
      <Text style={styles.menuItemTitle}>{title}</Text>
      <Text style={styles.menuItemSubtitle}>{subtitle}</Text>
    </View>
  </TouchableOpacity>
);

/**
 * Theme Row Component
 */
const ThemeRow = ({ theme, selected, onSelect }) => (
  <TouchableOpacity
    style={styles.themeRow}
    onPress={() => onSelect(theme.id)}
    activeOpacity={0.7}
  >
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected && <View style={styles.radioInner} />}
    </View>
    <Text style={styles.themeName}>{theme.name}</Text>
    <View style={styles.colorSwatches}>
      {theme.colors.map((color, index) => (
        <View
          key={`${theme.id}-${index}`}
          style={[styles.colorSwatch, { backgroundColor: color }]}
        />
      ))}
    </View>
  </TouchableOpacity>
);

/**
 * Layout Card Component
 */
const LayoutCard = ({ layout, selected, onSelect }) => (
  <TouchableOpacity
    style={[styles.layoutCard, selected && styles.layoutCardSelected]}
    onPress={() => onSelect(layout.id)}
    activeOpacity={0.7}
  >
    <View style={styles.layoutPreview}>
      {layout.thumbnail ? (
        <Image source={{ uri: layout.thumbnail }} style={styles.layoutImage} />
      ) : (
        <View style={styles.layoutPlaceholder}>
          <View style={styles.placeholderHeader} />
          <View style={styles.placeholderRow}>
            <View style={styles.placeholderBlock} />
            <View style={styles.placeholderBlock} />
          </View>
          <View style={styles.placeholderRow}>
            <View style={styles.placeholderBlock} />
            <View style={styles.placeholderBlock} />
          </View>
        </View>
      )}
    </View>
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected && <View style={styles.radioInner} />}
    </View>
  </TouchableOpacity>
);

/**
 * Sub-menu Header Component
 */
const SubMenuHeader = ({ onBack }) => (
  <TouchableOpacity
    style={styles.subMenuHeader}
    onPress={onBack}
    activeOpacity={0.7}
  >
    <Ionicons name="chevron-back" size={20} color="#111" />
    <Text style={styles.subMenuHeaderText}>Back to main menu</Text>
  </TouchableOpacity>
);

/**
 * Tab Switcher Component
 */
const TabSwitcher = ({ activeTab, onTabChange }) => (
  <View style={styles.tabContainer}>
    <TouchableOpacity
      style={[styles.tab, activeTab === "themes" && styles.tabActive]}
      onPress={() => onTabChange("themes")}
      activeOpacity={0.7}
    >
      <Text
        style={[styles.tabText, activeTab === "themes" && styles.tabTextActive]}
      >
        Themes
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.tab, activeTab === "layouts" && styles.tabActive]}
      onPress={() => onTabChange("layouts")}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.tabText,
          activeTab === "layouts" && styles.tabTextActive,
        ]}
      >
        Layouts
      </Text>
    </TouchableOpacity>
  </View>
);

/**
 * Main AddContextOverlay Component
 */
const AddContextOverlay = ({
  visible,
  onClose,
  onAction,
  selectedTheme: selectedThemeProp = null,
  selectedLayout: selectedLayoutProp = null,
}) => {
  const [currentView, setCurrentView] = useState(MENU_VIEWS.MAIN);
  const [activeTab, setActiveTab] = useState("themes");
  const [selectedTheme, setSelectedTheme] = useState(
    selectedThemeProp || "orange"
  );
  const [selectedLayout, setSelectedLayout] = useState(
    selectedLayoutProp || "layout1"
  );
  const [urlInput, setUrlInput] = useState("");
  const pendingActionRef = useRef(null);

  const flushPendingAction = useCallback(() => {
    const pending = pendingActionRef.current;
    if (!pending) {
      return;
    }
    pendingActionRef.current = null;
    onAction?.(pending.actionId, pending.payload);
  }, [onAction]);

  const queueActionAfterDismiss = useCallback(
    (actionId, payload) => {
      pendingActionRef.current = { actionId, payload };
      onClose?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (visible) {
      return undefined;
    }
    const id = requestAnimationFrame(() => {
      flushPendingAction();
    });
    return () => cancelAnimationFrame(id);
  }, [flushPendingAction, visible]);

  useEffect(() => {
    if (typeof selectedThemeProp === "string" && selectedThemeProp.trim()) {
      setSelectedTheme(selectedThemeProp);
    }
  }, [selectedThemeProp]);

  useEffect(() => {
    if (typeof selectedLayoutProp === "string" && selectedLayoutProp.trim()) {
      setSelectedLayout(selectedLayoutProp);
    }
  }, [selectedLayoutProp]);

  const handleQuickAction = (actionId) => {
    if (actionId === "url") {
      setUrlInput("");
      setCurrentView(MENU_VIEWS.URL);
      return;
    }
    queueActionAfterDismiss(actionId);
  };

  const handleMenuItem = (item) => {
    if (item.navigateTo) {
      setCurrentView(item.navigateTo);
    } else {
      queueActionAfterDismiss(item.id);
    }
  };

  const handleBack = () => {
    setCurrentView(MENU_VIEWS.MAIN);
    setActiveTab("themes");
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentView(tab === "themes" ? MENU_VIEWS.THEMES : MENU_VIEWS.LAYOUTS);
  };

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
    onAction?.("selectTheme", themeId);
  };

  const handleLayoutSelect = (layoutId) => {
    setSelectedLayout(layoutId);
    onAction?.("selectLayout", layoutId);
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    queueActionAfterDismiss("url", { url: trimmed });
  };

  const handleClose = () => {
    setCurrentView(MENU_VIEWS.MAIN);
    onClose?.();
  };

  const renderMainMenu = () => (
    <>
      {/* Quick Actions Row */}
      <View style={styles.quickActionsRow}>
        {QUICK_ACTIONS.map((action) => (
          <QuickActionButton
            key={action.id}
            icon={action.icon}
            label={action.label}
            onPress={() => handleQuickAction(action.id)}
          />
        ))}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Menu Items */}
      <View style={styles.menuItems}>
        {MENU_ITEMS.map((item) => (
          <MenuItem
            key={item.id}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => handleMenuItem(item)}
          />
        ))}
      </View>
    </>
  );

  const renderThemesMenu = () => (
    <>
      <SubMenuHeader onBack={handleBack} />
      <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
      <ScrollView
        style={styles.themesList}
        showsVerticalScrollIndicator={false}
      >
        {THEMES.map((theme) => (
          <ThemeRow
            key={theme.id}
            theme={theme}
            selected={selectedTheme === theme.id}
            onSelect={handleThemeSelect}
          />
        ))}
      </ScrollView>
    </>
  );

  const renderLayoutsMenu = () => (
    <>
      <SubMenuHeader onBack={handleBack} />
      <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
      <ScrollView
        style={styles.layoutsGrid}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.layoutsRow}>
          {LAYOUTS.map((layout) => (
            <LayoutCard
              key={layout.id}
              layout={layout}
              selected={selectedLayout === layout.id}
              onSelect={handleLayoutSelect}
            />
          ))}
        </View>
      </ScrollView>
    </>
  );

  const renderUrlMenu = () => (
    <>
      <SubMenuHeader onBack={handleBack} />
      <Text style={styles.urlLabel}>Paste a URL to attach as context</Text>
      <View style={styles.urlInputRow}>
        <TextInput
          style={styles.urlInput}
          placeholder="https://..."
          placeholderTextColor="#999"
          value={urlInput}
          onChangeText={setUrlInput}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
          onSubmitEditing={handleUrlSubmit}
          autoFocus
        />
        <TouchableOpacity
          style={[styles.urlSubmitButton, !urlInput.trim() && styles.urlSubmitButtonDisabled]}
          onPress={handleUrlSubmit}
          disabled={!urlInput.trim()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-forward" size={18} color={urlInput.trim() ? "#fff" : "#999"} />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      onDismiss={flushPendingAction}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Content */}
          <View style={styles.sheetContent}>
            {currentView === MENU_VIEWS.MAIN && renderMainMenu()}
            {currentView === MENU_VIEWS.THEMES && renderThemesMenu()}
            {currentView === MENU_VIEWS.LAYOUTS && renderLayoutsMenu()}
            {currentView === MENU_VIEWS.URL && renderUrlMenu()}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  // Quick Actions
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
  },
  quickAction: {
    alignItems: "center",
    gap: 8,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  quickActionLabel: {
    fontSize: 12,
    color: "#111",
    fontWeight: "500",
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 4,
  },
  // Menu Items
  menuItems: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  // Sub Menu Header
  subMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  subMenuHeaderText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  // Tabs
  tabContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  tabActive: {
    backgroundColor: "#f5f5f5",
    borderColor: "#111",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  tabTextActive: {
    color: "#111",
  },
  // Radio
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#d0d0d0",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#111",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#111",
  },
  // Themes List
  themesList: {
    maxHeight: 300,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  themeName: {
    flex: 1,
    fontSize: 15,
    color: "#111",
  },
  colorSwatches: {
    flexDirection: "row",
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  // Layouts Grid
  layoutsGrid: {
    maxHeight: 400,
  },
  layoutsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  layoutCard: {
    width: "30%",
    aspectRatio: 0.6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    padding: 8,
    backgroundColor: "#fff",
  },
  layoutCardSelected: {
    borderColor: "#111",
    borderWidth: 2,
  },
  layoutPreview: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  layoutImage: {
    width: "100%",
    height: "100%",
  },
  layoutPlaceholder: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 6,
    gap: 4,
  },
  placeholderHeader: {
    height: 12,
    backgroundColor: "#e5e5e5",
    borderRadius: 2,
  },
  placeholderRow: {
    flexDirection: "row",
    gap: 4,
    flex: 1,
  },
  placeholderBlock: {
    flex: 1,
    backgroundColor: "#e5e5e5",
    borderRadius: 2,
  },
  // URL Input
  urlLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    marginTop: 4,
  },
  urlInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  urlInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111",
    backgroundColor: "#fafafa",
  },
  urlSubmitButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  urlSubmitButtonDisabled: {
    backgroundColor: "#e5e5e5",
  },
});

export default AddContextOverlay;
