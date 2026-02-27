import React from "react";
import TemplateListScreen from "./TemplateListScreen";
import { useTemplates } from "./TemplatesProvider";
import { ROUTES } from "../../navigation";

const TemplatesListRoute = ({ navigation, route }) => {
  const { templates, loading, error, reload } = useTemplates();
  const initialTab = route?.params?.initialTab || "discover";

  return (
    <TemplateListScreen
      templates={templates}
      loading={loading}
      error={error}
      onReload={reload}
      onSelectTemplate={(templateKey) =>
        navigation.navigate(ROUTES.TEMPLATE_DETAIL, { templateKey })
      }
      initialTab={initialTab}
      canGoBack={navigation.canGoBack}
      onBack={navigation.goBack}
    />
  );
};

export default TemplatesListRoute;

