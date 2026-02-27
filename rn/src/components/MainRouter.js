import React, { useMemo, useRef, useEffect } from "react";
import {
  AppNavigator,
  NavigationProvider,
  buildInitialRoute,
  resolveRoute,
  ROUTES,
  useNavigation,
} from "../navigation";
import { AiChatProvider } from "../screens/aiChat/AiChatProvider";
import { TemplatesProvider } from "../screens/templates/TemplatesProvider";
import ChatDashboardScreen from "../screens/aiChat/ChatDashboardScreen";
import ChatSessionScreen from "../screens/aiChat/ChatSessionScreen";
import TemplatesListRoute from "../screens/templates/TemplatesListRoute";
import TemplateDetailRoute from "../screens/templates/TemplateDetailRoute";
import ProfileScreen from "./ProfileScreen";

export const rootOptions = { disableScrollView: true };

const ROUTE_CONFIG = {
  [ROUTES.CHAT_DASHBOARD]: { component: ChatDashboardScreen },
  [ROUTES.CHAT_SESSION]: { component: ChatSessionScreen },
  [ROUTES.TEMPLATES_LIST]: { component: TemplatesListRoute },
  [ROUTES.TEMPLATE_DETAIL]: { component: TemplateDetailRoute },
  [ROUTES.PROFILE]: { component: ProfileScreen },
};

const RouteSync = ({ route, screen, internalUrl, params }) => {
  const navigation = useNavigation();
  const lastKeyRef = useRef(null);
  const target = useMemo(
    () => resolveRoute(route || screen || internalUrl, params),
    [route, screen, internalUrl, params]
  );

  useEffect(() => {
    if (!target?.name) return;
    const nextKey = `${target.name}:${JSON.stringify(target.params || {})}`;
    if (nextKey === lastKeyRef.current) return;
    lastKeyRef.current = nextKey;
    navigation.reset(target.name, target.params);
  }, [target?.name, target?.params, navigation]);

  return null;
};

const MainRouter = (props) => {
  const hasExplicitRoute = Boolean(props.route || props.screen || props.internalUrl);
  const initialRoute = buildInitialRoute({
    route: props.route,
    screen: props.screen,
    internalUrl: props.internalUrl,
    params: props.params,
  });

  return (
    <NavigationProvider initialRoute={initialRoute}>
      <AiChatProvider hasExplicitRoute={hasExplicitRoute}>
        <TemplatesProvider>
          <RouteSync
            route={props.route}
            screen={props.screen}
            internalUrl={props.internalUrl}
            params={props.params}
          />
          <AppNavigator routes={ROUTE_CONFIG} />
        </TemplatesProvider>
      </AiChatProvider>
    </NavigationProvider>
  );
};

export default MainRouter;
