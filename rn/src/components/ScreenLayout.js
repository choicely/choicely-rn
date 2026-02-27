import React from "react";
import { View, StyleSheet } from "react-native";
import ScreenHeader from "./ScreenHeader";

const ScreenLayout = ({
  header,
  title,
  canGoBack,
  onBack,
  leftIcon,
  onLeftPress,
  rightContent,
  showAppBadge,
  badgeLabel,
  showLogo,
  centerContent,
  children,
}) => {
  return (
    <View style={styles.container}>
      {header !== null && (
        <ScreenHeader
          title={title}
          canGoBack={canGoBack}
          onBack={onBack}
          leftIcon={leftIcon}
          onLeftPress={onLeftPress}
          rightContent={rightContent}
          showAppBadge={showAppBadge}
          badgeLabel={badgeLabel}
          showLogo={showLogo}
          centerContent={centerContent}
        />
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
});

export default ScreenLayout;
