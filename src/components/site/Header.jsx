import { HeaderNav } from "./HeaderNav";
import { Logo } from "./Logo";

/** Server wrapper: passes admin-controlled data (menus, header settings, contact) to the interactive header. */
export function Header({ chrome }) {
  return (
    <HeaderNav
      items={chrome.menus.header}
      families={chrome.menus.mega}
      header={chrome.header}
      contact={chrome.contact}
      logo={<Logo chrome={chrome} priority />}
    />
  );
}
