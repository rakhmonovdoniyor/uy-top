function MiniStat({ icon: Icon, label, value }) {
  return (
    <article className="mini-stat">
      <span>
        <Icon aria-hidden="true" />
      </span>
      <strong>{value}</strong>
      <small>{label}</small>
    </article>
  );
}

export default MiniStat;
