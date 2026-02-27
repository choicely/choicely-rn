import React from "react";
import { View, StyleSheet } from "react-native";
import Dashboard from "../../components/Dashboard";

const DashboardScreen = ({
  onSendMessage,
  onAppSwitch,
  history,
  inputValue: inputValueProp,
  onInputChange: onInputChangeProp,
}) => {
  const hasInputOverride =
    inputValueProp != null || typeof onInputChangeProp === "function";

  return (
    <View style={styles.container}>
      {hasInputOverride ? (
        <Dashboard
          onSendMessage={onSendMessage}
          onAppSwitch={onAppSwitch}
          history={history}
          inputText={inputValueProp}
          onInputTextChange={onInputChangeProp}
        />
      ) : (
        <Dashboard
          onSendMessage={onSendMessage}
          onAppSwitch={onAppSwitch}
          history={history}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default DashboardScreen;
