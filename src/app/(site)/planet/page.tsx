import Planet from "../../_components/planet/Planet";

export const metadata = {
  title: "Planet CAS | CyberAdSpace",
  description: "Walk Main Street on Planet CAS: every Cyber Ad Space brand has a building, and every agent you meet is a real agent with its live status.",
};

export default function PlanetPage() {
  return (
    <main id="main-content" className="planet-page">
      <Planet />
    </main>
  );
}
