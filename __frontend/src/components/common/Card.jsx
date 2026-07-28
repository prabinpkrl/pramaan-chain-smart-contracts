function Card({ children, className = "", elevated = false }) {
  return (
    <div className={`${elevated ? "app-panel-raised" : "app-panel"} panel-padding ${className}`}>
      {children}
    </div>
  );
}

export default Card;
