import React, { useMemo, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import TemplateCard from "./TemplateCard";
import ScreenLayout from "../../components/ScreenLayout";

const TAB_OPTIONS = [
    { key: "discover", label: "Discover templates" },
    { key: "featured", label: "Featured Apps" },
];

const TemplateListScreen = ({
    templates,
    loading,
    error,
    onReload,
    onSelectTemplate,
    initialTab = "discover",
    canGoBack = false,
    onBack,
}) => {
    const [activeTab, setActiveTab] = React.useState(initialTab);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const featuredTemplates = useMemo(() => {
        const sorted = [...templates].sort((a, b) => {
            const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
            const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
            return bTime - aTime;
        });
        return sorted.slice(0, 6);
    }, [templates]);

    const visibleTemplates =
        activeTab === "featured" ? featuredTemplates : templates;

    return (
        <ScreenLayout
            title="Choicely"
            canGoBack={canGoBack}
            onBack={onBack}
            showLogo={true}
        >
            <View style={styles.container}>
                <View style={styles.tabs}>
                    {TAB_OPTIONS.map((tab) => {
                        const isActive = tab.key === activeTab;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                onPress={() => setActiveTab(tab.key)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.tab, isActive && styles.tabActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {loading && (
                        <View style={styles.loadingBlock}>
                            <ActivityIndicator size="small" color="#111" />
                            <Text style={styles.loadingText}>Loading templates…</Text>
                        </View>
                    )}

                    {!loading && error && (
                        <View style={styles.errorBlock}>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity style={styles.retryButton} onPress={onReload}>
                                <Text style={styles.retryText}>Try again</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {!loading && !error && templates.length === 0 && (
                        <View style={styles.emptyBlock}>
                            <Text style={styles.emptyTitle}>No templates yet</Text>
                            <Text style={styles.emptyText}>
                                We could not find public templates right now.
                            </Text>
                        </View>
                    )}

                    {!loading && !error && templates.length > 0 && (
                        <View style={styles.listGrid}>
                            {visibleTemplates.map((item) => (
                                <TemplateCard
                                    key={item.key}
                                    item={item}
                                    onPress={() => onSelectTemplate(item.key)}
                                />
                            ))}
                        </View>
                    )}
                </ScrollView>
            </View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    tabs: {
        flexDirection: "row",
        gap: 16,
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    tab: {
        fontSize: 14,
        fontWeight: "600",
        color: "#8c8c8c",
        paddingBottom: 6,
    },
    tabActive: {
        color: "#111",
        borderBottomWidth: 2,
        borderBottomColor: "#111",
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    loadingBlock: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 20,
    },
    loadingText: {
        fontSize: 13,
        color: "#444",
    },
    errorBlock: {
        paddingVertical: 18,
        gap: 10,
    },
    errorText: {
        fontSize: 13,
        color: "#c92a2a",
    },
    retryButton: {
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: "#111",
    },
    retryText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    emptyBlock: {
        paddingVertical: 18,
        gap: 6,
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111",
    },
    emptyText: {
        fontSize: 12,
        color: "#666",
    },
    listGrid: {
        gap: 16,
        paddingTop: 8,
    },
});

export default TemplateListScreen;
