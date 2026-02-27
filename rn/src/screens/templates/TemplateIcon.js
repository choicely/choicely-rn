import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { BACKEND_URL } from "../../services/ChoicelyApiService";

const buildImageUrl = (imageKey) =>
    imageKey ? `${BACKEND_URL}/images/${imageKey}/serve/` : null;

const TemplateIcon = ({ iconKey, accent, style, imageStyle }) => {
    const iconUrl = buildImageUrl(iconKey);
    if (!iconUrl) {
        return (
            <View style={[styles.icon, { backgroundColor: accent }, style]} />
        );
    }
    return (
        <View style={[styles.icon, style]}>
            <Image source={{ uri: iconUrl }} style={[styles.iconImage, imageStyle]} />
        </View>
    );
};

const styles = StyleSheet.create({
    icon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    iconImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
});

export default TemplateIcon;
