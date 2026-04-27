export const metadata = {
  title: "NinjaCuts",
  description: "Provisionsystem för NinjaCuts",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body style={{ margin: 0, background: "#faf7f2" }}>{children}</body>
    </html>
  );
}
