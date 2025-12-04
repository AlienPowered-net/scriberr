import { Page, Text } from "@shopify/polaris";

export default function ScriberrFullPageLoader({ 
  heading = "Loading Scriberr...",
  subtext = "Please wait while we prepare your workspace"
}) {
  return (
    <Page title={heading}>
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "60vh",
        flexDirection: "column",
        gap: "20px"
      }}>
        <div style={{
          width: "60px",
          height: "60px",
          border: "4px solid #e1e3e5",
          borderTop: "4px solid #5c6ac4",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
        <Text variant="headingMd" tone="subdued">{heading}</Text>
        <Text variant="bodyMd" tone="subdued">{subtext}</Text>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Ensure fullscreen editor appears above all other elements */
        .advanced-rte-container.fixed {
          z-index: 9999999 !important;
          position: fixed !important;
        }
      `}</style>
    </Page>
  );
}

