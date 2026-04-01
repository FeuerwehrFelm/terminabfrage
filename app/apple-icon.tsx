import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f1d34",
          borderRadius: 36,
          color: "#facc15",
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: -3,
        }}
      >
        TF
      </div>
    ),
    size
  );
}
