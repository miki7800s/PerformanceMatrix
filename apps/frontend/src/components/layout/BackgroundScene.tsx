/**
 * Animated brand background built from the uploaded SVG assets
 * (planet with rocket, astronaut, trees) plus soft brand-color glows.
 * Purely decorative: aria-hidden, pointer-events off, disabled for
 * print and for users preferring reduced motion (see index.css).
 */
export function BackgroundScene() {
  return (
    <div className="scene" aria-hidden>
      <div className="scene-glow scene-glow-green" />
      <div className="scene-glow scene-glow-purple" />
      <div className="scene-glow scene-glow-azure" />
      <img
        src="/assets/planet-rocket-astronauts.svg"
        alt=""
        className="scene-planet"
        loading="lazy"
      />
      <img
        src="/assets/astronaut.svg"
        alt=""
        className="scene-astronaut"
        loading="lazy"
      />
      <img src="/assets/trees.svg" alt="" className="scene-trees" loading="lazy" />
    </div>
  )
}
