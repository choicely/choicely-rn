import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { getFormattedHoursMinutes } from '../utils/datetime'
import UrlInfoBox from './UrlInfoBox'
import { buildTextWithLinks } from '../utils/urlUtils'
import AppReadyCard from './AppReadyCard'
import { ColorSwatchGroup } from './ColorSwatch'

function MessageItem({ item }) {
    const isUser = item.role === 'user'
    const content = item.content || item.text || ''

    // Detect message types (this logic might need adjustment based on actual API)
    // For now, checks for 'app_ready' type or specific custom properties
    const isAppReady = item.type === 'app_ready' || item.isAppReady
    const hasColors = item.colors && Array.isArray(item.colors) && item.colors.length > 0

    const renderContent = (text) => {
        // Simple text renderer with URL detection logic
        const parts = buildTextWithLinks(text, (url, index) => (
            <UrlInfoBox key={index} url={url} style={styles.urlInfo} />
        ))

        return parts.map((part, index) => {
            if (typeof part === 'string') {
                return <Text key={index} style={[styles.messageText, isUser ? styles.textUser : styles.textBot]}>{part}</Text>
            }
            return part // UrlInfoBox
        })
    }

    // Render special card content
    if (isAppReady) {
        return (
            <View style={[styles.messageRow, styles.rowBot]}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>🤖</Text>
                </View>
                <View style={styles.appReadyContent}>
                    {/* Optional text before card */}
                    {content ? (
                        <View style={[styles.messageBubble, styles.bubbleBot, styles.bubbleSpacing]}>
                            {renderContent(content)}
                        </View>
                    ) : null}

                    {hasColors && (
                        <View style={[styles.messageBubble, styles.bubbleBot, styles.bubbleSpacing]}>
                            <ColorSwatchGroup colors={item.colors} />
                        </View>
                    )}

                    <AppReadyCard
                        title={item.cardTitle || "Your app is ready!"}
                        subtitle={item.cardSubtitle || "Check out the new version"}
                        timestamp={item.updated}
                        onPress={() => item.onCardPress && item.onCardPress()}
                        onMenuPress={() => { }}
                    />
                    <Text style={styles.timestampText}>
                        {getFormattedHoursMinutes(item.updated)}
                    </Text>
                </View>
            </View>
        )
    }

    return (
        <View style={[styles.messageRow, isUser ? styles.rowUser : styles.rowBot]}>
            {!isUser && (
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>🤖</Text>
                </View>
            )}

            <View
                style={[
                    styles.messageBubble,
                    isUser ? styles.bubbleUser : styles.bubbleBot
                ]}>

                <View>
                    {renderContent(content)}

                    {hasColors && (
                        <ColorSwatchGroup colors={item.colors} />
                    )}
                </View>

                {item.updated && (
                    <Text style={styles.timestampText}>
                        {getFormattedHoursMinutes(item.updated)}
                    </Text>
                )}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    messageRow: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-end',
        paddingHorizontal: 16
    },
    rowUser: {
        justifyContent: 'flex-end'
    },
    rowBot: {
        justifyContent: 'flex-start'
    },
    avatar: {
        width: 32,
        height: 32,
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EBEBEB',
        borderRadius: 16
    },
    avatarText: {
        fontSize: 16
    },
    appReadyContent: {
        flex: 1,
        maxWidth: '88%'
    },
    messageBubble: {
        padding: 12,
        borderRadius: 18,
        minWidth: 60
    },
    bubbleUser: {
        backgroundColor: '#EBEBEB',
        maxWidth: '75%',
        marginLeft: 40
    },
    bubbleBot: {
        backgroundColor: 'transparent',
        maxWidth: '88%',
        paddingLeft: 0,
        paddingRight: 0
    },
    bubbleSpacing: {
        marginBottom: 8
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22
    },
    textUser: {
        color: '#1A1A1A'
    },
    textBot: {
        color: '#333'
    },
    timestampText: {
        fontSize: 10,
        color: '#999',
        marginTop: 4,
        alignSelf: 'flex-end'
    },
    urlInfo: {
        marginTop: 8
    }
})

export default MessageItem
