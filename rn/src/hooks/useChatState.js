import { useState, useCallback } from 'react'

const WELCOME_MESSAGE = {
    text: '👋 Hi! I can help you build mobile apps. Just describe what you want to create!',
    role: 'bot'
}

const SUGGESTIONS = {
    initial: [
        {
            icon: '🚀',
            text: 'Create an app from my website',
            prompt: 'Create a new app'
        },
        {
            icon: '💡',
            text: 'What can you do?',
            prompt: 'What are your capabilities?'
        },
        {
            icon: '🎨',
            text: 'Change App Colors',
            prompt: 'I want to change the app colors'
        }
    ],
    error: [
        {
            icon: '🔄',
            text: 'Retry',
            prompt: 'Retry the previous action'
        },
        { icon: '🆘', text: 'Get Help', prompt: 'Help with AI' }
    ],
    finalize: [
        {
            icon: '🎨',
            text: 'Change Colors',
            prompt: 'I want to update the app visuals'
        },
        {
            icon: '📝',
            text: 'Write an Article',
            prompt: 'Create a new article'
        },
        {
            icon: '📲',
            text: 'How to Publish?',
            prompt: 'Guide me through publishing'
        }
    ]
}

const useChatState = (initialMessages = [WELCOME_MESSAGE]) => {
    const [messages, setMessages] = useState(initialMessages)
    const [renderState, setRenderState] = useState(null)
    const [verboseLog, setVerboseLog] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [suggestions, setSuggestions] = useState(SUGGESTIONS.initial)
    const [confirmation, setConfirmation] = useState(null)

    const updateSuggestions = useCallback(typeOrList => {
        if (Array.isArray(typeOrList)) {
            setSuggestions(typeOrList)
        } else if (SUGGESTIONS[typeOrList]) {
            setSuggestions(SUGGESTIONS[typeOrList])
        }
    }, [])

    const resetChat = useCallback(
        (customInitialMessages = initialMessages) => {
            setMessages(customInitialMessages)
            setLoading(false)
            setVerboseLog(null)
            setError(null)
            setRenderState(null)
            setSuggestions(SUGGESTIONS.initial)
        },
        [initialMessages]
    )

    const clearMessages = useCallback(() => {
        resetChat()
    }, [resetChat])

    return {
        messages,
        setMessages,
        renderState,
        setRenderState,
        verboseLog,
        setVerboseLog,
        loading,
        setLoading,
        error,
        setError,
        suggestions,
        setSuggestions,
        confirmation,
        setConfirmation,
        updateSuggestions,
        resetChat,
        clearMessages,
        showSuggestions:
            !loading &&
            (messages.length === 1 || suggestions.length > 0 || error !== null)
    }
}

export default useChatState
