import { sourceAttribution } from "@/data/source-attribution";

export default function SourcesPage() {
  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Sources</p>
        <h1>Licenses</h1>
        <p className="lede">Imported content stays as a candidate until reviewed and approved for personal learning.</p>
      </section>
      <section className="grid">
        {sourceAttribution.map((source) => (
          <article className="panel" key={source.name}>
            <h2>{source.name}</h2>
            <p className="muted">{source.license}</p>
            <p>{source.note}</p>
            {"url" in source && source.url ? (
              <a className="button secondary" href={source.url}>
                Open source
              </a>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
