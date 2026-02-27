import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native'

function UrlInfoBox({ url, style }) {
    // Mobile adaptation: Simplified version without metadata fetching for now
    // In a real app, you might want to fetch OG tags from a backend service or use a library

    const getDomain = (value) => {
        try {
            const urlObj = new URL(value)
            return urlObj.hostname
        } catch (e) {
            return value
        }
    }

    const handlePress = () => {
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    }

    return (
        <TouchableOpacity
            style={[styles.container, style]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <View style={styles.fallbackContainer}>
                <View style={styles.header}>
                    <Text style={styles.domain} numberOfLines={1}>{getDomain(url)}</Text>
                    <Text style={styles.arrowIcon}>↗</Text>
                </View>
                <Text style={styles.urlText} numberOfLines={1}>{url}</Text>
            </View>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
        marginBottom: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        backgroundColor: '#f9f9f9',
        overflow: 'hidden'
    },
    fallbackContainer: {
        padding: 12
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    domain: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333'
    },
    arrowIcon: {
        fontSize: 12,
        color: '#999'
    },
    urlText: {
        fontSize: 12,
        color: '#007AFF', // Standard link color
        textDecorationLine: 'underline'
    }
})

export default UrlInfoBox
