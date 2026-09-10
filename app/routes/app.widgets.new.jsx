import { redirect, useActionData, useNavigate, useNavigation } from "react-router";
import { requireAdmin } from "../lib/auth.server";
import { createDraftWidget } from "../services/widgets/widget.server";
import { shopTimezoneForMerchant } from "../services/shopify/merchant.server";
import { formErrors, locationSchema } from "../lib/validation";
import { LocationPicker } from "../components/widgets/LocationPicker";
import { ActionButton } from "../components/common/ActionButton";
import { ErrorBanner } from "../components/common/Feedback";
import { defaultWidgetName } from "../lib/constants";

export const loader = async ({ request }) => {
  await requireAdmin(request);
  return {};
};

export const action = async ({ request }) => {
  const { admin, merchant } = await requireAdmin(request);
  if (!merchant?.id) {
    return { errors: { form: "Shop is not ready. Reload the app and try again." } };
  }

  const formData = await request.formData();
  const parsed = locationSchema.safeParse({
    location: formData.get("location"),
    name: formData.get("name") || undefined,
  });

  if (!parsed.success) {
    return { errors: formErrors(parsed.error) };
  }

  try {
    const timezone = await shopTimezoneForMerchant(admin, merchant);
    const widget = await createDraftWidget(merchant.id, {
      name: parsed.data.name || defaultWidgetName(parsed.data.location),
      location: parsed.data.location,
      displayMode: formData.get("displayMode") || "GENERAL",
      timezone,
    });
    return redirect(`/app/widgets/${widget.id}?tab=conditions&created=1`);
  } catch (error) {
    if (error?.code === "CART_MODE_EXISTS" || error?.code === "CHECKOUT_UNAVAILABLE") {
      return { errors: { form: error.message } };
    }
    return {
      errors: {
        form: error?.message || "Could not create the widget. Try again.",
      },
    };
  }
};

export default function NewWidget() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const navigate = useNavigate();

  return (
    <s-page heading="Choose placement type">
      <ActionButton slot="breadcrumb-actions" variant="tertiary" onClick={() => navigate("/app")}>
        Home
      </ActionButton>
      {navigation.state !== "idle" ? (
        <s-banner tone="info">Creating widget…</s-banner>
      ) : null}
      <ErrorBanner errors={actionData?.errors} />
      <p className="edd-back">
        <button type="button" className="edd-widget-name" onClick={() => navigate("/app")}>
          ← Home
        </button>
      </p>
      <LocationPicker />
    </s-page>
  );
}
