import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f1d34 0%, #132544 55%, #1e3a8a 100%)",
          color: "#facc15",
          fontSize: 180,
          fontWeight: 800,
          letterSpacing: -8,
        }}
      >
        TF
      </div>
    ),
    size
  );
}
