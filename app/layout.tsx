export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dashboard-bg text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
