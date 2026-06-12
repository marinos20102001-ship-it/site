import React from "react";

export default function Logo({ size = "md", color = "#1E3A8A" }) {
  const sizes = {
    sm: { letters: "text-2xl", width: 80 },
    md: { letters: "text-3xl", width: 96 },
    lg: { letters: "text-5xl", width: 140 },
    xl: { letters: "text-7xl", width: 200 },
  };
  const s = sizes[size] || sizes.md;
  return (
    <div className="dm-logo" data-testid="dm-logo" style={{ color }}>
      <div className={`letters ${s.letters} font-serif-display`} style={{ color }}>
        <span className="d">D</span>
        <span className="m" style={{ color }}>M</span>
      </div>
      <div className="underline" style={{ background: color, width: s.width }} />
    </div>
  );
}
