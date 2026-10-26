function WorkflowCard({ icon: Icon, text, title }) {
  return (
    <article className="workflow-card">
      <span>
        <Icon aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

export default WorkflowCard;
