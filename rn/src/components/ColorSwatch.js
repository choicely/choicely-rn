import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

/**
 * Inline color swatch component for displaying color changes
 * Shows a colored circle with label and hex code
 * 
 * @param {string} label - Color label (e.g., "Primary", "Secondary")
 * @param {string} color - Hex color code (e.g., "#55914D")
 * @param {string} colorName - Optional color name (e.g., "Forest green")
 */
export default function ColorSwatch({ label, color, colorName }) {
    return (
        <View style={styles.container}>
            <View style={[styles.colorCircle, { backgroundColor: color }]} />
            <Text style={styles.label}>
                {label}: {colorName || ''} {color}
            </Text>
        </View>
    )
}

/**
 * Container for multiple color swatches (e.g., Primary + Secondary)
 */
export function ColorSwatchGroup({ colors }) {
    return (
        <View style={styles.group}>
            <Text style={styles.groupTitle}>I've changed your app colors</Text>
            {colors.map((colorItem, index) => (
                <ColorSwatch
                    key={index}
                    label={colorItem.label}
                    color={colorItem.color}
                    colorName={colorItem.name}
                />
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    colorCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    label: {
        fontSize: 13,
        color: '#333',
    },
    group: {
        marginTop: 8,
        marginBottom: 8,
    },
    groupTitle: {
        fontSize: 14,
        color: '#333',
        marginBottom: 8,
    }
})
