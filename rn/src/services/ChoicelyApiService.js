/**
 * Choicely Backend API Service
 * Handles REST API calls to backend.choicely.com for brand/app/screen creation
 */

export const BACKEND_URL = "https://backend.choicely.com";

/**
 * Create a new brand for the user
 * @param {string} accessToken - User's access token
 * @param {string} userKey - User's key for the u= query parameter
 * @param {string} fullName - Brand name (default: "My account")
 * @returns {Promise<Object>} Created brand data
 */
export async function createBrand(
  accessToken,
  userKey,
  fullName = "My account"
) {
  console.log("[ChoicelyApi] Creating brand for user:", userKey);

  const response = await fetch(`${BACKEND_URL}/brands/?u=${userKey}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access: { access: "public" },
      full_name: fullName,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[ChoicelyApi] Create brand failed:", response.status, error);
    throw new Error(`Failed to create brand: ${response.status}`);
  }

  const brand = await response.json();
  console.log("[ChoicelyApi] Brand created:", brand.key);
  return brand;
}

/**
 * Create a main screen for the brand
 * @param {string} accessToken - User's access token
 * @param {string} brandKey - Brand key for the b= query parameter
 * @returns {Promise<Object>} Created screen data
 */
export async function createScreen(accessToken, brandKey) {
  console.log("[ChoicelyApi] Creating screen for brand:", brandKey);

  const response = await fetch(`${BACKEND_URL}/screens?b=${brandKey}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Main Screen",
      full_screen: false,
      swipe_to_close: true,
      bottom_nav: {
        nav_list: [],
        style: {
          primary_color: "#737373",
          secondary_color: "#4ce2a7",
          bg_color: null,
          text_color: "#737373",
          bg_image: null,
          icon_tint: null,
          gravity: null,
          bg_gradient: null,
        },
      },
      menu_nav: null,
      toolbar: {
        title: "",
        subtitle: "",
        style: {
          primary_color: "#4ce2a7",
          secondary_color: null,
          bg_color: "#FFFFFF",
          text_color: "#737373",
          bg_image: null,
          icon_tint: null,
          gravity: "left",
          bg_gradient: null,
        },
      },
      top_right_button: null,
      default_nav_item: null,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(
      "[ChoicelyApi] Create screen failed:",
      response.status,
      error
    );
    throw new Error(`Failed to create screen: ${response.status}`);
  }

  const screen = await response.json();
  console.log("[ChoicelyApi] Screen created:", screen.key);
  return screen;
}

/**
 * Fetch brand access for a target key (app key or other)
 * @param {string} accessToken - User's access token
 * @param {string} userKey - User key for the u= query parameter
 * @param {string} targetKey - target key to check (e.g. app key)
 * @param {{ throwOnError?: boolean }} options
 * @returns {Promise<Array<string>>} list of brand keys
 */
export async function fetchBrandAccess(
  accessToken,
  userKey,
  targetKey,
  options = {}
) {
  const throwOnError = options?.throwOnError === true;
  if (!userKey || !targetKey) return [];
  if (!accessToken) {
    if (throwOnError) {
      const requestError = new Error("Failed to check brand access: missing access token");
      requestError.status = 401;
      throw requestError;
    }
    return [];
  }

  // iOS can drop Authorization on redirected requests. Use canonical URL form to avoid redirects.
  const encodedTargetKey = encodeURIComponent(targetKey);
  const encodedUserKey = encodeURIComponent(userKey);
  const url = `${BACKEND_URL}/users/check_brand_access/${encodedTargetKey}/?u=${encodedUserKey}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const error = await response.text();
    console.warn(
      "[ChoicelyApi] check_brand_access failed:",
      response.status,
      error
    );
    if (throwOnError) {
      const requestError = new Error(
        `Failed to check brand access: ${response.status}`
      );
      requestError.status = response.status;
      requestError.responseText = error;
      throw requestError;
    }
    return [];
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch app data with brand suffix (required for access in some cases)
 * @param {string} accessToken - User's access token
 * @param {string} appKey - App key
 * @param {string} brandKey - Brand key
 * @returns {Promise<Object|null>} app payload or null
 */
export async function fetchAppWithBrand(accessToken, appKey, brandKey) {
  if (!accessToken || !appKey || !brandKey) return null;
  const url = `${BACKEND_URL}/apps/${appKey}/?b=${encodeURIComponent(brandKey)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    const error = await response.text();
    console.warn("[ChoicelyApi] fetch app failed:", response.status, error);
    return null;
  }
  return response.json();
}

/**
 * Fetch public brand blueprints (templates)
 * @param {Object} options
 * @param {string} options.accessFilter
 * @param {number} options.pageSize
 * @returns {Promise<Object>} payload with brand_blueprints
 */
export async function fetchBrandBlueprints(options = {}) {
  const { accessFilter = "public_use", pageSize = 20 } = options;
  const url = `${BACKEND_URL}/brand_blueprints/?access_filter=${encodeURIComponent(accessFilter)}&page_size=${pageSize}`;
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.text();
    console.warn(
      "[ChoicelyApi] fetch brand blueprints failed:",
      response.status,
      error
    );
    throw new Error(`Failed to fetch templates: ${response.status}`);
  }
  return response.json();
}

/**
 * Create a new app for the brand
 * @param {string} accessToken - User's access token
 * @param {string} brandKey - Brand key for the b= query parameter
 * @param {string} screenKey - Main screen key
 * @param {string} providerKey - Provider key from brand creation
 * @param {string} firebaseProjectKey - Firebase project key from brand creation
 * @returns {Promise<Object>} Created app data
 */
export async function createApp(
  accessToken,
  brandKey,
  screenKey,
  providerKey,
  firebaseProjectKey
) {
  console.log("[ChoicelyApi] Creating app for brand:", brandKey);
  const resolvedProviderKey = providerKey || undefined;
  const resolvedFirebaseProjectKey = firebaseProjectKey || undefined;

  const response = await fetch(`${BACKEND_URL}/apps?b=${brandKey}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access: { access: "public" },
      title: "Default App",
      image: null,
      config: { gen_state: "AI_EMPTY" },
      build: {},
      toolbar: {
        title: "",
        subtitle: "",
        style: {
          primary_color: null,
          secondary_color: null,
          bg_color: "#FFFFFF",
          text_color: "#737373",
          bg_image: null,
          icon_tint: null,
          gravity: "left",
        },
      },
      studio_app_profile: {
        is_profile_enabled: true,
        is_name_enabled: true,
        is_age_enabled: true,
        is_city_enabled: true,
        is_auto_profile_image_enabled: true,
        is_forgot_your_password_enabled: true,
        is_logout_enabled: true,
        provider_key: resolvedProviderKey,
        firebase_project_key: resolvedFirebaseProjectKey,
        auth_methods: {
          is_email: true,
          is_sms: true,
          is_facebook: false,
          is_google: false,
          is_apple: false,
        },
        login: {
          title: "Sign in",
          description: "This is description of Choicely Studio app",
          bottom_text:
            'By signing up you agree to <a href="https://www.choicely.com/terms-and-conditions" target="_blank">Terms of Service</a> and <a href="https://www.choicely.com/privacy-policy" target="_blank">Privacy Policy</a>',
          is_powered_by_choicely: true,
          powered_by_choicely_link: "https://choicely.com/",
          style: {
            primary_color: "#4ce2a7",
            secondary_color: null,
            bg_color: "#FFFFFF",
            text_color: "#737373",
            bg_image: null,
            icon_tint: null,
            gravity: null,
          },
        },
        register: {
          title: "Sign up",
          description: "This is description of Choicely Studio app",
          bottom_text:
            'By signing up you agree to <a href="https://www.choicely.com/terms-and-conditions" target="_blank">Terms of Service</a> and <a href="https://www.choicely.com/privacy-policy" target="_blank">Privacy Policy</a>',
          is_powered_by_choicely: true,
          powered_by_choicely_link: "https://choicely.com/",
          style: {
            primary_color: "#4ce2a7",
            secondary_color: null,
            bg_color: "#FFFFFF",
            text_color: "#737373",
            bg_image: null,
            icon_tint: null,
            gravity: null,
          },
        },
        profile: {
          title: "Profile",
          description: "Information in your profile is private",
          bottom_text: null,
          is_powered_by_choicely: true,
          powered_by_choicely_link: "https://choicely.com/",
          style: {
            primary_color: "#4ce2a7",
            secondary_color: null,
            bg_color: "#FFFFFF",
            text_color: "#737373",
            bg_image: null,
            icon_tint: null,
            gravity: null,
          },
        },
      },
      master_shop_key: null,
      screens: [screenKey],
      default_nav_item: { screen_key: screenKey },
      fallback_screen_key: null,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[ChoicelyApi] Create app failed:", response.status, error);
    throw new Error(`Failed to create app: ${response.status}`);
  }

  const app = await response.json();
  console.log("[ChoicelyApi] App created:", app.key);
  return app;
}

/**
 * Initialize a new chat by creating brand, screen, and app
 * @param {string} accessToken - User's access token
 * @param {string} userKey - User's key
 * @returns {Promise<{brandKey: string, appKey: string, screenKey: string}>}
 */
export async function initializeNewChat(accessToken, userKey) {
  console.log("[ChoicelyApi] Initializing new chat for user:", userKey);

  // Step 1: Create brand
  const brand = await createBrand(accessToken, userKey);
  const brandKey = brand.key;
  const providerKey = brand.provider?.key;
  const firebaseProjectKey = brand.firebase_project?.key;

  // Step 2: Create screen
  const screen = await createScreen(accessToken, brandKey);
  const screenKey = screen.key;

  // Step 3: Create app
  const app = await createApp(
    accessToken,
    brandKey,
    screenKey,
    providerKey,
    firebaseProjectKey
  );
  const appKey = app.key;

  console.log("[ChoicelyApi] New chat initialized:", {
    brandKey,
    appKey,
    screenKey,
  });

  return {
    brandKey,
    appKey,
    screenKey,
    brand,
    app,
    screen,
  };
}

/**
 * Apply a template blueprint to create an app under user's brand
 * @param {string} accessToken - User's access token
 * @param {string} brandKey - User's brand key
 * @param {string} blueprintKey - Template blueprint key to use
 * @returns {Promise<{appKey: string, app: Object}>}
 */
export async function applyTemplateBlueprint(
  accessToken,
  brandKey,
  blueprintKey
) {
  console.log("[ChoicelyApi] Applying template blueprint:", {
    brandKey,
    blueprintKey,
  });

  const url = `${BACKEND_URL}/brand_blueprints/${blueprintKey}/copy?b=${encodeURIComponent(brandKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[ChoicelyApi] Use template failed:", response.status, error);
    throw new Error(`Failed to use template: ${response.status}`);
  }

  const result = await response.json();
  // API returns app_key with underscore
  const appKey = result.app_key || result.app?.key || result.appKey || result.key;
  console.log("[ChoicelyApi] Template applied, app created:", appKey);

  return {
    appKey,
    app: result.app || result,
    result,
  };
}
