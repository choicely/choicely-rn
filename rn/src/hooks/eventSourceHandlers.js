/**
 * Event source handlers for SSE streaming chat responses
 * Adapted from studio createEventSourceHandlers.js for mobile
 */

const createEventSourceHandlers = ({
    threadId,
    getThreadId,
    setMessages,
    setLoading,
    setError,
    setVerboseLog,
    setRenderState,
    updateSuggestions,
    onDone,
    onAppKey,
    getStreamKey
}) => {
    const resolveThreadId = () =>
        typeof getThreadId === 'function' ? getThreadId() : threadId
    const resolveStreamKey = () =>
        typeof getStreamKey === 'function' ? getStreamKey() : null

    let sawRefreshWidget = false
    let doneReceived = false
    let lastStreamKey = resolveStreamKey()

    const resetStreamStateIfNeeded = () => {
        const currentStreamKey = resolveStreamKey()
        if (!currentStreamKey || currentStreamKey === lastStreamKey) {
            return
        }
        lastStreamKey = currentStreamKey
        sawRefreshWidget = false
        doneReceived = false
    }

    const maybeFireDone = () => {
        if (!doneReceived || !sawRefreshWidget) {
            return
        }
        if (onDone) {
            onDone()
        }
        doneReceived = false
        sawRefreshWidget = false
    }

    const getAiMessageChunk = (parsedData) => {
        if (typeof parsedData.AI_Message === 'string') {
            return parsedData.AI_Message
        }
        if (parsedData.event_type === 'ai_message' && typeof parsedData.message === 'string') {
            return parsedData.message
        }
        return null
    }

    const handleMessage = (eventSource, event) => {
        resetStreamStateIfNeeded()
        const data = event.data.trim()
        const now = Date.now()

        if (data === '[DONE]') {
            eventSource.close()
            setLoading(false)
            setError(null)
            setVerboseLog(null)
            doneReceived = true
            maybeFireDone()
            return
        }

        try {
            const jsonData = data.startsWith('data:') ? data.slice(5).trim() : data
            const parsedData = JSON.parse(jsonData)
            const appKey = parsedData.app_key || parsedData.appKey
            const appName = parsedData.app_name || parsedData.appName
            if (appKey && onAppKey) {
                onAppKey({ appKey, appName })
            }

            const aiMessageChunk = getAiMessageChunk(parsedData)
            if (aiMessageChunk !== null) {
                if (aiMessageChunk === '') {
                    setLoading(true)
                    return
                }

                // AI content is arriving - hide loading indicator, show message
                setLoading(false)

                setMessages(prev => {
                    const lastMessage = prev[prev.length - 1]
                    if (lastMessage && lastMessage.role === 'bot') {
                        const updatedMessage = {
                            ...lastMessage,
                            text: lastMessage.text + aiMessageChunk,
                            updated: now
                        }
                        return [...prev.slice(0, -1), updatedMessage]
                    }
                    return [
                        ...prev,
                        {
                            text: aiMessageChunk,
                            role: 'bot',
                            updated: now,
                            threadId: resolveThreadId()
                        }
                    ]
                })
            } else if (parsedData.event_type !== undefined) {
                switch (parsedData.event_type) {
                    case 'ai_message': {
                        // Handled above by getAiMessageChunk.
                        break
                    }
                    case 'processing_update': {
                        setVerboseLog(parsedData.message)
                        break
                    }
                    case 'status_update': {
                        setVerboseLog(parsedData.message)
                        break
                    }
                    case 'tool_start': {
                        const toolName = parsedData.tool || 'tool'
                        setVerboseLog(`Running ${toolName.replace(/_/g, ' ')}...`)
                        break
                    }
                    case 'tool_end': {
                        // Tool execution completed - handled by status_update
                        break
                    }
                    case 'update_suggestions': {
                        if (Array.isArray(parsedData.suggestions)) {
                            updateSuggestions(parsedData.suggestions)
                        }
                        break
                    }
                    case 'refresh_widget': {
                        setRenderState(null)
                        updateSuggestions('finalize')
                        setMessages(prev => {
                            const lastMessage = prev[prev.length - 1]
                            return [
                                ...prev.slice(0, -1),
                                {
                                    ...lastMessage,
                                    updated: now,
                                    renderState: { key: 'mobile', nonce: now }
                                }
                            ]
                        })
                        sawRefreshWidget = true
                        maybeFireDone()
                        break
                    }
                    case 'refresh_sidebar': {
                        // No-op on mobile - no sidebar to refresh
                        break
                    }
                    default: {
                        if (__DEV__) {
                            console.debug('Unhandled event type:', parsedData.event_type)
                        }
                    }
                }
            }
        } catch (error) {
            // Fallback: Append the raw text if JSON parsing fails
            setMessages(prev => {
                const lastMessage = prev[prev.length - 1]
                if (lastMessage && lastMessage.role === 'bot') {
                    return [
                        ...prev.slice(0, -1),
                        {
                            ...lastMessage,
                            text: lastMessage.text + event.data,
                            updated: now
                        }
                    ]
                }
                return [
                    ...prev,
                    {
                        text: event.data,
                        role: 'bot',
                        updated: now,
                        threadId: resolveThreadId()
                    }
                ]
            })
        }
    }

    const handleError = (eventSource, event) => {
        console.error('EventSource error:', event)
        const message = event?.message || 'Streaming error occurred'
        setError(message)
        setLoading(false)
        eventSource.close()
        updateSuggestions('error')
    }

    return {
        onMessage: handleMessage,
        onError: handleError
    }
}

export default createEventSourceHandlers
