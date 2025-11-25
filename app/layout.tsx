export const metadata = {
  title: "IWBC Tub Deflection Calculator",
  description: "Deflection calculator for MDF tub and 2525 extrusion frame"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
