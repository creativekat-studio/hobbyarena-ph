import { useShopNavLayout } from "../lib/shopNavLayout.jsx";
import CustomerNavbar from "../customer/CustomerNavbar.jsx";
import DockNavbar from "./DockNavbar.jsx";

export default function StorefrontNavbar(props) {
  const { layoutId } = useShopNavLayout();
  if (layoutId === "dock") {
    return <DockNavbar {...props} />;
  }
  return <CustomerNavbar {...props} />;
}
