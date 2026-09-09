export function InstitutionalPage({
  title,
  description,
  body,
}: {
  title: string;
  description?: string;
  body: string[];
}) {
  return (
    <main className="section">
      <div className="container article-content">
        <p className="eyebrow">Institucional</p>
        <h1>{title}</h1>
        {description ? <p className="institutional-lead">{description}</p> : null}
        {body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </main>
  );
}
