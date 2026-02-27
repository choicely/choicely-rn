import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "./NavigationProvider";

const NotFoundScreen = ({ routeName }) => (
  <View style={styles.notFound}>
    <Text style={styles.notFoundTitle}>Unknown screen</Text>
    <Text style={styles.notFoundSubtitle}>{routeName}</Text>
  </View>
);

const AppNavigator = ({ routes }) => {
  const navigation = useNavigation();
  const current = navigation.current;

  if (!current) {
    return <NotFoundScreen routeName="missing" />;
  }

  const Screen = routes[current.name]?.component;
  if (!Screen) {
    return <NotFoundScreen routeName={current.name} />;
  }

  return <Screen navigation={navigation} route={current} />;
};

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  notFoundSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
  },
});

export default AppNavigator;

