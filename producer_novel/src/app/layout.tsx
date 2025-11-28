/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/root-layout
 * 
 * Root layout for Next.js App Router
 */
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EPUB Editor',
  description: 'Tiptap editor based EPUB editing tool with AI Generator integration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

