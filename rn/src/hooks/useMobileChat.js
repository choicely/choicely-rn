import { useEffect } from 'react'
import useChatState from './useChatState'
import useMobileChatApi from './useMobileChatApi'

/**
 * Main chat hook for mobile
 * Simplified from studio useChat - no local storage, no brand/app loading
 */
const useMobileChat = (token, brandId, appId, screenId) => {
    const chatState = useChatState()

    const ids = { brandId, appId, screenId }
    const api = useMobileChatApi(token, ids, {
        ...chatState,
        setIds: () => {}
    })

    // Reset state when key parameters change
    useEffect(() => {
        api.abortRequest()
        chatState.resetChat()
    }, [token, brandId, appId, screenId, api, chatState])

    return {
        messages: chatState.messages,
        sendMessage: api.sendMessage,
        loading: chatState.loading,
        error: chatState.error,
        suggestions: chatState.suggestions,
        showSuggestions: chatState.showSuggestions,
        verboseLog: chatState.verboseLog,
        clearMessages: chatState.clearMessages,
        confirmation: chatState.confirmation,
        renderState: chatState.renderState
    }
}

export default useMobileChat
