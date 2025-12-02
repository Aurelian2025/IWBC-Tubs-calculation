import "./globals.css";
export const metadata = {
  title: "IWBC Tub Deflection Calculator",
  description: "Deflection calculator for cold plunge tub"
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
