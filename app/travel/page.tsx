import { allPhrases } from "@/data/all-phrases";
import { TravelPlayer } from "@/components/TravelPlayer";

export default function TravelPage() {
  return (
    <div className="page">
      <section className="band">
        <p className="eyebrow">Travel mode</p>
        <h1>Commute drill</h1>
        <p className="lede">Large controls, low reading load, and browser TTS for quick practice while waiting or travelling.</p>
      </section>
      <TravelPlayer phrases={allPhrases} />
    </div>
  );
}
