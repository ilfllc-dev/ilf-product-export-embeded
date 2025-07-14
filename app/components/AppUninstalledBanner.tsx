import { Banner } from "@shopify/polaris";

interface AppUninstalledBannerProps {
  shop?: string;
}

export function AppUninstalledBanner({ shop }: AppUninstalledBannerProps) {
  const handleReinstall = () => {
    // Redirect to Shopify app installation
    if (shop) {
      const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=read_products,write_products&redirect_uri=${process.env.SHOPIFY_APP_URL}/auth/callback`;
      window.location.href = installUrl;
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
