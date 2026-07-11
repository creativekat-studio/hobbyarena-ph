import { SvgIcon } from "@mui/material";

export function BrandMark(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path
        d="M12 2 3 6.5v6c0 4.7 3.6 8.4 9 9.5 5.4-1.1 9-4.8 9-9.5v-6L12 2Z"
        fill="currentColor"
        opacity="0.16"
      />
      <path
        d="M12 2 3 6.5v6c0 4.7 3.6 8.4 9 9.5 5.4-1.1 9-4.8 9-9.5v-6L12 2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m12 7 1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5L12 7Z"
        fill="currentColor"
      />
    </SvgIcon>
  );
}

export function PokeballIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 12h6m6 0h6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </SvgIcon>
  );
}

export function CardIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <rect x="3.5" y="5" width="11" height="15" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M16 7.2 19.7 8.3a1.6 1.6 0 0 1 1.1 2l-3 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="m9 9 1.2 2.5L13 12l-2 1.9.5 2.8L9 15.4 6.5 16.7 7 13.9 5 12l2.8-.5L9 9Z" fill="currentColor" />
    </SvgIcon>
  );
}

export function BoxIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path
        d="M12 3 4 7v10l8 4 8-4V7l-8-4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M4 7l8 4 8-4M12 11v10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function BoltIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" />
    </SvgIcon>
  );
}

export function InventoryIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <rect x="3" y="4" width="18" height="4" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 12h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function UserIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="8" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function MailIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function BellIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path d="M12 3a5 5 0 0 0-5 5v2.6c0 .7-.2 1.4-.6 2L5 14.5h14l-1.4-1.9c-.4-.6-.6-1.3-.6-2V8a5 5 0 0 0-5-5Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 17a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function HeartIcon({ solid = false, ...props }) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path
        d="M12 20.5s-7-4.6-7-10a4 4 0 0 1 7-2.5 4 4 0 0 1 7 2.5c0 5.4-7 10-7 10Z"
        fill={solid ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

export function EditIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path
        d="M4 20h4l10.5-10.5a1.8 1.8 0 0 0 0-2.5L16 4.5a1.8 1.8 0 0 0-2.5 0L4 14v6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="m13.5 6.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function ViewTableIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9h18M3 14h18M9 9v11" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </SvgIcon>
  );
}

export function ViewGridIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </SvgIcon>
  );
}

export function SearchIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function TruckIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="7" cy="17.5" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.5" cy="17.5" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </SvgIcon>
  );
}

export function ShieldIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path d="M12 3 5 6v6c0 4 3 6.8 7 8 4-1.2 7-4 7-8V6l-7-3Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function SparkleIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" fill="currentColor" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" fill="currentColor" opacity="0.7" />
    </SvgIcon>
  );
}

export function CartIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path
        d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.2L20 7H6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.4" fill="currentColor" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" />
    </SvgIcon>
  );
}

export function SunIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

export function MoonIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function CogIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M19.14 12.94a7.49 7.49 0 0 0 .05-.94 7.49 7.49 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.02 7.02 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.19 8.8a.5.5 0 0 0 .12.64l2.03 1.58c-.03.31-.05.63-.05.94 0 .31.02.63.05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.42.34.68.24l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.26.1.54 0 .68-.24l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
      />
    </SvgIcon>
  );
}

export function InstagramIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16.6" cy="7.4" r="1" fill="currentColor" />
    </SvgIcon>
  );
}

export function FacebookIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path
        d="M14 8.5V7c0-.8.5-1 1-1h1.5V3H14c-2 0-3.5 1.4-3.5 3.6V8.5H8.5v3h2V21h3.5v-9.5H17l.5-3H14Z"
        fill="currentColor"
      />
    </SvgIcon>
  );
}

export function TiktokIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path
        d="M14 3c.4 2.4 1.9 4 4.3 4.3v3c-1.6 0-3-.5-4.3-1.4V15a6 6 0 1 1-6-6c.3 0 .7 0 1 .1v3.1a3 3 0 1 0 2 2.8V3h3Z"
        fill="currentColor"
      />
    </SvgIcon>
  );
}

export function EyeIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path
        d="M12 5c5.2 0 9.2 4.2 10 7-.8 2.8-4.8 7-10 7S2.8 14.8 2 12c.8-2.8 4.8-7 10-7Zm0 2.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5Zm0 2A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5Z"
        fill="currentColor"
      />
    </SvgIcon>
  );
}

export function EyeOffIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path
        d="M3.3 4.7 4.7 3.3l16 16-1.4 1.4-2.5-2.5A11.6 11.6 0 0 1 12 19c-5.2 0-9.2-4.2-10-7 .4-1.4 1.6-3.2 3.4-4.7L3.3 4.7ZM12 7c5.2 0 9.2 4.2 10 7-.3 1-1 2.2-2.1 3.4l-2.2-2.2A4.5 4.5 0 0 0 10.8 9.3L8.7 7.2C9.7 7.1 10.8 7 12 7Zm-4.4 4.5 5.9 5.9A4.5 4.5 0 0 1 7.6 11.5Z"
        fill="currentColor"
      />
    </SvgIcon>
  );
}

/** Simple trash can — lid + body, matches admin delete affordance. */
export function TrashIcon(props) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path
        d="M9.2 3.75h5.6c.3 0 .55.25.55.55V5.5h3.4c.4 0 .75.35.75.75s-.35.75-.75.75h-1.05v11.2c0 1.2-.95 2.15-2.15 2.15H8.45c-1.2 0-2.15-.95-2.15-2.15V7h-1.05c-.4 0-.75-.35-.75-.75s.35-.75.75-.75h3.4V4.3c0-.3.25-.55.55-.55Zm1.05 1.75v-.5h3.5v.5h-3.5ZM7.8 7v11.2c0 .36.29.65.65.65h7.1c.36 0 .65-.29.65-.65V7H7.8Zm2.2 2.4c.4 0 .75.35.75.75v5.6c0 .4-.35.75-.75.75s-.75-.35-.75-.75v-5.6c0-.4.35-.75.75-.75Zm4 0c.4 0 .75.35.75.75v5.6c0 .4-.35.75-.75.75s-.75-.35-.75-.75v-5.6c0-.4.35-.75.75-.75Z"
        fill="currentColor"
      />
    </SvgIcon>
  );
}
