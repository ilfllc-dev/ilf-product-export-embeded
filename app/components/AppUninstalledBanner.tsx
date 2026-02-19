import { Banner } from "@shopify/polaris";

interface AppUninstalledBannerProps {
  shop?: string;
}

export function AppUninstalledBanner({ shop }: AppUninstalledBannerProps) {
  const handleReinstall = () => {
    // Use server-side login route so env config is resolved on the server
    if (shop) {
      window.location.href = `/auth/login?shop=${encodeURIComponent(shop)}`;
    } else {
      // Fallback to app store
      window.open("https://apps.shopify.com", "_blank");
    }
  };

  return (
    <Banner
      title="App Uninstalled"
      tone="critical"
      action={{
        content: "Reinstall App",
        onAction: handleReinstall,
      }}
    >
      <p>
        This app has been uninstalled from your store. To continue using the
        app, you need to reinstall it. Click the button above to reinstall the
        app.
      </p>
      {shop && (
        <p>
          <strong>Store:</strong> {shop}
        </p>
      )}
    </Banner>
  );
}
