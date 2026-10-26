function PageIntro({ kicker, text, title }) {
  return (
    <section className="page-intro">
      <span className="estate-kicker">{kicker}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

export default PageIntro;
