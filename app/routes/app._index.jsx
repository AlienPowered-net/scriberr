import Notepad from "../components/Notepad";

export const meta = () => {
  return [
    { title: "Shopify Notepad" },
    { name: "description", content: "Simple embedded notepad for Shopify staff." },
  ];
};

export default function Index() {
  return <Notepad />;
}
