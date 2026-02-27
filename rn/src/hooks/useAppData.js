import { useState, useEffect, useMemo } from 'react'
import { createBridgeClient } from '../bridge/ChoicelyRNBridge'

export default function useAppData() {
    const [context, setContext] = useState(null)
    const [appConfig, setAppConfig] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Bridge client instance
    const bridge = useMemo(() => createBridgeClient(), [])

    useEffect(() => {
        let mounted = true

        const fetchContextAndConfig = async () => {
            try {
                // 1. Get Context from Native Bridge
                console.log('Fetching app context from bridge...')
                const ctx = await bridge.request('choicely:app:getContext')
                console.log('Got context:', ctx)

                if (mounted) setContext(ctx)

                // 2. Get App Config from Bridge (Offline support)
                console.log('Fetching app config from bridge...')
                const configData = await bridge.request('choicely:app:getConfig')
                console.log('App config response:', configData)

                if (mounted) {
                    setAppConfig(configData)
                    setLoading(false)
                }

            } catch (err) {
                console.error('Error in useAppData:', err)
                if (mounted) {
                    setError(err)
                    setLoading(false)
                }
            }
        }

        fetchContextAndConfig()

        return () => {
            mounted = false
            bridge.destroy()
        }
    }, [bridge])

    // Helper to get start screen ID
    const startScreenId = useMemo(() => {
        if (!appConfig) return null

        // Priority 1: default_nav_item
        if (appConfig.default_nav_item) {
            if (appConfig.default_nav_item.screen_key) return appConfig.default_nav_item.screen_key
            if (appConfig.default_nav_item.item_id) return appConfig.default_nav_item.item_id
        }

        // Priority 2: first screen in screens list
        if (appConfig.screens && appConfig.screens.length > 0) {
            const firstScreen = appConfig.screens[0]
            return typeof firstScreen === 'string' ? firstScreen : firstScreen.key || firstScreen.id
        }

        return null
    }, [appConfig])

    return {
        context,
        appConfig,
        startScreenId,
        loading,
        error
    }
}
