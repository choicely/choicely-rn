import { useCallback, useRef, useState } from "react";
import { getMMKV, removeMMKVKey } from "../state/mmkv";
import {
    createBrand,
    fetchBrandAccess,
} from "../services/ChoicelyApiService";
import { createBridgeClient } from "../bridge/ChoicelyRNBridge";

const BRAND_CACHE_KEY = "choicely:rn:user_brand";

/**
 * Read cached user brand from MMKV
 * @returns {{ brandKey: string, userKey: string, providerKey?: string | null, firebaseProjectKey?: string | null, updated: number } | null}
 */
const readCachedBrand = () => {
    try {
        const storage = getMMKV();
        const raw = storage.getString(BRAND_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !parsed.brandKey) return null;
        return parsed;
    } catch (error) {
        console.warn("[useBrandManager] Failed to read cached brand", error);
        return null;
    }
};

/**
 * Write user brand to MMKV cache
 * @param {string} brandKey
 * @param {string} userKey
 * @param {string | null} providerKey
 * @param {string | null} firebaseProjectKey
 */
const writeCachedBrand = (brandKey, userKey, providerKey = null, firebaseProjectKey = null) => {
    try {
        const storage = getMMKV();
        storage.set(
            BRAND_CACHE_KEY,
            JSON.stringify({
                brandKey,
                userKey,
                providerKey,
                firebaseProjectKey,
                updated: Date.now(),
            })
        );
    } catch (error) {
        console.warn("[useBrandManager] Failed to write cached brand", error);
    }
};

/**
 * Remove cached user brand from MMKV
 */
const deleteCachedBrand = () => {
    try {
        removeMMKVKey(BRAND_CACHE_KEY);
    } catch (error) {
        console.warn("[useBrandManager] Failed to delete cached brand", error);
    }
};

/**
 * Centralized hook for brand management
 * - Gets/creates user's brand (lazy creation on first use)
 * - Caches brandKey to MMKV for persistence
 * - Fetches brandKey for apps without brandKey (QR scan scenario)
 */
export function useBrandManager() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const bridgeRef = useRef(null);

    /**
     * Get bridge client (lazy initialization)
     */
    const getBridge = useCallback(() => {
        if (!bridgeRef.current) {
            bridgeRef.current = createBridgeClient();
        }
        return bridgeRef.current;
    }, []);

    /**
     * Get user info from bridge
     */
    const getUserInfo = useCallback(async () => {
        const bridge = getBridge();
        const userInfo = await bridge.request("choicely:auth:getUserInfo");
        if (!userInfo?.accessToken || !userInfo?.userKey) {
            throw new Error("User not authenticated");
        }
        return userInfo;
    }, [getBridge]);

    /**
     * Get user's brand key - returns cached or creates new
     * @returns {Promise<{ brandKey: string, isNew: boolean, providerKey?: string | null, firebaseProjectKey?: string | null }>}
     */
    const getUserBrandKey = useCallback(async (existingUserInfo = null) => {
        setLoading(true);
        setError(null);

        try {
            // Reuse caller-provided identity when available to avoid duplicate bridge requests.
            const userInfo =
                existingUserInfo?.accessToken && existingUserInfo?.userKey
                    ? existingUserInfo
                    : await getUserInfo();
            const { accessToken, userKey } = userInfo;

            // Check cache only after resolving current user identity.
            const cached = readCachedBrand();
            if (cached?.brandKey && cached?.userKey === userKey) {
                console.log("[useBrandManager] Using cached brand:", cached.brandKey);
                setLoading(false);
                return {
                    brandKey: cached.brandKey,
                    providerKey: cached.providerKey || null,
                    firebaseProjectKey: cached.firebaseProjectKey || null,
                    isNew: false,
                };
            }

            if (cached?.brandKey && cached?.userKey && cached.userKey !== userKey) {
                console.log("[useBrandManager] Cached brand belongs to another user, resetting cache");
                deleteCachedBrand();
            }

            // Create new brand
            console.log("[useBrandManager] Creating new brand for user:", userKey);
            const brand = await createBrand(accessToken, userKey);
            const brandKey = brand.key;
            const providerKey = brand?.provider?.key || null;
            const firebaseProjectKey = brand?.firebase_project?.key || null;

            // Cache the brand
            writeCachedBrand(brandKey, userKey, providerKey, firebaseProjectKey);
            console.log("[useBrandManager] Brand created and cached:", brandKey);

            setLoading(false);
            return { brandKey, providerKey, firebaseProjectKey, isNew: true, brand };
        } catch (err) {
            console.error("[useBrandManager] getUserBrandKey failed:", err);
            setError(err.message || "Failed to get brand");
            setLoading(false);
            throw err;
        }
    }, [getUserInfo]);

    /**
     * Get brand key for a specific app (e.g., from QR scan)
     * Uses fetchBrandAccess to find which brand has access to the app
     * @param {string} appKey
     * @returns {Promise<string | null>}
     */
    const getBrandKeyForApp = useCallback(
        async (appKey) => {
            if (!appKey) return null;

            setLoading(true);
            setError(null);

            try {
                const userInfo = await getUserInfo();
                const { accessToken, userKey } = userInfo;

                const brands = await fetchBrandAccess(accessToken, userKey, appKey);
                if (Array.isArray(brands) && brands.length > 0) {
                    const brandKey = brands[0];
                    console.log("[useBrandManager] Found brand for app:", { appKey, brandKey });
                    setLoading(false);
                    return brandKey;
                }

                console.log("[useBrandManager] No brand found for app:", appKey);
                setLoading(false);
                return null;
            } catch (err) {
                console.error("[useBrandManager] getBrandKeyForApp failed:", err);
                setError(err.message || "Failed to get brand for app");
                setLoading(false);
                throw err;
            }
        },
        [getUserInfo]
    );

    /**
     * Clear cached brand (for logout/reset)
     */
    const clearCachedBrand = useCallback(() => {
        try {
            deleteCachedBrand();
            console.log("[useBrandManager] Cleared cached brand");
        } catch (err) {
            console.warn("[useBrandManager] Failed to clear cached brand", err);
        }
    }, []);

    /**
     * Get cached brand key without creating (read-only)
     * @returns {string | null}
     */
    const getCachedBrandKey = useCallback(() => {
        const cached = readCachedBrand();
        return cached?.brandKey || null;
    }, []);

    return {
        loading,
        error,
        getUserBrandKey,
        getBrandKeyForApp,
        getCachedBrandKey,
        clearCachedBrand,
    };
}

export default useBrandManager;
