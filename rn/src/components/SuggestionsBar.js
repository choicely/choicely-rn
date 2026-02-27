import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

function SuggestionsBar({ suggestions, onSelect, disabled }) {
    return (
        <View style={styles.suggestionsContainer}>
            {suggestions.map((suggestion, idx) => {
                const text =
                    typeof suggestion === 'string' ? suggestion : suggestion.text
                const prompt =
                    typeof suggestion === 'string' ? suggestion : suggestion.prompt
                const icon = typeof suggestion === 'string' ? null : suggestion.icon

                return (
                    <TouchableOpacity
                        key={idx}
                        style={styles.chip}
                        onPress={() => !disabled && onSelect(prompt)}
                        disabled={disabled}>
                        <Text style={styles.chipText}>
                            {icon}
                            {icon ? ' ' : ''}
                            {text}
                        </Text>
                    </TouchableOpacity>
                )
            })}
        </View>
    )
}

const styles = StyleSheet.create({
    suggestionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 4,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#EBEBEB'
    },
    chip: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0'
    },
    chipText: {
        fontSize: 13,
        color: '#444'
    }
})

export default SuggestionsBar
