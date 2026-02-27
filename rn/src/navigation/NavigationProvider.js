import React, { createContext, useCallback, useMemo, useReducer, useRef } from "react";
import { BackHandler } from "react-native";

const NavigationContext = createContext(null);

let routeCounter = 0;

const createRoute = (name, params) => {
  routeCounter += 1;
  return {
    key: `${name}-${Date.now()}-${routeCounter}`,
    name,
    params: params || {},
  };
};

const reducer = (state, action) => {
  switch (action.type) {
    case "PUSH": {
      return {
        ...state,
        stack: [...state.stack, createRoute(action.name, action.params)],
      };
    }
    case "REPLACE": {
      if (state.stack.length === 0) {
        return { ...state, stack: [createRoute(action.name, action.params)] };
      }
      return {
        ...state,
        stack: [
          ...state.stack.slice(0, state.stack.length - 1),
          createRoute(action.name, action.params),
        ],
      };
    }
    case "RESET": {
      return { ...state, stack: [createRoute(action.name, action.params)] };
    }
    case "POP": {
      if (state.stack.length <= 1) return state;
      return { ...state, stack: state.stack.slice(0, state.stack.length - 1) };
    }
    default:
      return state;
  }
};

export const NavigationProvider = ({ initialRoute, children }) => {
  const initialRef = useRef(
    initialRoute ? [createRoute(initialRoute.name, initialRoute.params)] : []
  );
  const [state, dispatch] = useReducer(reducer, {
    stack: initialRef.current.length > 0 ? initialRef.current : [],
  });

  const navigate = useCallback((name, params) => {
    if (!name) return;
    dispatch({ type: "PUSH", name, params });
  }, []);

  const replace = useCallback((name, params) => {
    if (!name) return;
    dispatch({ type: "REPLACE", name, params });
  }, []);

  const reset = useCallback((name, params) => {
    if (!name) return;
    dispatch({ type: "RESET", name, params });
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: "POP" });
  }, []);

  const value = useMemo(() => {
    const stack = state.stack;
    const current = stack[stack.length - 1] || null;
    return {
      stack,
      current,
      canGoBack: stack.length > 1,
      navigate,
      replace,
      reset,
      goBack,
    };
  }, [state.stack, navigate, replace, reset, goBack]);

  React.useEffect(() => {
    const onBackPress = () => {
      if (value.canGoBack) {
        value.goBack();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [value]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = React.useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
};

