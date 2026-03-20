import type { ReactNode } from "react";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dashboard-bg text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
