"use client";
// VotingBox.tsx
import React, { useState } from "react";

type VotingBoxProps = {
  value: number;
  onChange: (v: number) => void;
  songTitle?: string | null;
  songArtist?: string | null;
  onSkip?: () => void;
  touched?: boolean;
  onTouched?: () => void;
};

const skipOverlayStyles = `
  @keyframes ib-overlay-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ib-skip-overlay {
    position: absolute; inset: 0; z-index: 40;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; padding: 24px;
    background: rgba(15,15,20,0.92); backdrop-filter: blur(10px);
    animation: ib-overlay-in 0.25s ease both;
  }
  .ib-btn-danger {
    background: rgba(220,60,60,0.15);
    color: rgba(255,100,100,0.85);
    border: 1px solid rgba(220,60,60,0.25);
    cursor: pointer;
  }
  .ib-btn-danger:hover { background: rgba(220,60,60,0.22); }
`;

export function VotingBox({ value, onChange, songTitle, songArtist, onSkip, touched, onTouched }: VotingBoxProps) {
  const [skipConfirm, setSkipConfirm] = useState(false);
  const pct = ((value - 1) / 9) * 100;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <style dangerouslySetInnerHTML={{ __html: skipOverlayStyles }} />

      {/* Overlay conferma skip */}
      {skipConfirm && (
        <div className="ib-skip-overlay">
          <div style={{ fontSize: 28, marginBottom: 4 }}>🤔</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#ededed", textAlign: "center" }}>
            Saltare il voto?
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.5, maxWidth: 220 }}>
            Non potrai votare questa canzone. La tua scelta non sarà visibile agli altri.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: 8 }}>
            <button
              className="ib-btn ib-btn-danger"
              onClick={() => { setSkipConfirm(false); onSkip?.(); }}
            >
              Sì, salta il voto
            </button>
            <button
              className="ib-btn ib-btn-live"
              onClick={() => setSkipConfirm(false)}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Contenuto principale */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "24px 22px",
      }}>
        {/* Titolo canzone */}
        {(songTitle || songArtist) && (
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            {songArtist && (
              <div style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 500,
                marginBottom: 4,
              }}>
                {songArtist}
              </div>
            )}
            {songTitle && (
              <div style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#ededed",
                letterSpacing: "-0.3px",
                lineHeight: 1.2,
              }}>
                {songTitle}
              </div>
            )}
          </div>
        )}

        {/* Valore */}
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 56,
          fontWeight: 400,
          color: "#ededed",
          lineHeight: 1,
          letterSpacing: "-1px",
          marginBottom: 4,
        }}>
          {value.toFixed(1)}
        </div>
        <div style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.25)",
          marginBottom: 28,
          letterSpacing: "0.05em",
        }}>
          su 10
        </div>

        {/* Slider */}
        <div style={{ width: "100%" }}>
          <input
            type="range"
            min={1}
            max={10}
            step={0.1}
            value={value}
            onChange={(e) => { onChange(parseFloat(e.target.value)); onTouched?.(); }}
            className="ib-slider"
            style={{
              background: `linear-gradient(to right,
                rgba(255,255,255,0.6) 0%,
                rgba(255,255,255,0.6) ${pct}%,
                rgba(255,255,255,0.1) ${pct}%,
                rgba(255,255,255,0.1) 100%)`,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <span key={n} style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                color: Math.round(value) === n ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.12)",
                transition: "color 0.15s",
              }}>
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* Salta il voto */}
        {onSkip && (
          <button
            onClick={() => setSkipConfirm(true)}
            style={{
              marginTop: 18,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              color: "rgba(200,80,80,0.5)",
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.04em",
              padding: 0,
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(200,80,80,0.75)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(200,80,80,0.5)")}
          >
            Salta il voto
          </button>
        )}
      </div>
    </div>
  );
}