export default function Avatar({ user, size = 32 }) {
  const name = user?.name || '?';
  const style = { width: size, height: size, fontSize: size * 0.42 };
  if (user?.avatar) {
    return <img className="avatar" src={user.avatar} alt={name} style={style} referrerPolicy="no-referrer" />;
  }
  return (
    <span className="avatar avatar-fallback" style={style} aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
