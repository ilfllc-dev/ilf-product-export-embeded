import { useEffect } from "react";
import { useSearchParams } from "@remix-run/react";

export default function TopLevelRedirect() {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  useEffect(() => {
    if (redirectUrl) {
      if (window.top === window.self) {
        // Not in an iframe
        window.location.href = redirectUrl;
      } else if (window.top) {
        // In an iframe, force top-level redirect
        window.top.location.href = redirectUrl;
      }
    }
  }, [redirectUrl]);

  return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <h2>Redirecting to Shopify for authentication...</h2>
      {redirectUrl && (
        <a href={redirectUrl} target="_blank" rel="noopener noreferrer">
          Click here if you are not redirected automatically
        </a>
      )}
    </div>
  );
}
