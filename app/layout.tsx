import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ABPLL Level List',
  description: 'ABPLL Level List'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
