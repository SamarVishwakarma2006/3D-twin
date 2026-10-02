import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Inside / Digital Twin Studio', description: 'Explore product components, dependencies and failure scenarios in an interactive 3D workspace.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
