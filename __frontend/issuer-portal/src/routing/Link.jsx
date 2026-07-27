import { useRouter } from "./useRouter";

export function Link({ to, children, className = "", ...props }) {
  const { navigate } = useRouter();
  const click = (event) => {
    props.onClick?.(event);
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) return;
    event.preventDefault();
    navigate(to);
  };
  return <a {...props} href={to} className={className} onClick={click}>{children}</a>;
}

export function NavLink({ to, end = false, children, className = "" }) {
  const { location } = useRouter();
  const active = end
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(`${to}/`);
  const resolvedClass = typeof className === "function"
    ? className({ isActive: active })
    : className;
  return <Link to={to} className={resolvedClass}>{children}</Link>;
}
