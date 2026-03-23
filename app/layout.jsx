import "./globals.css";

export const metadata = {
  title: "KPI Tracker — Powered by Notion",
  description: "AI-powered client quarterly performance tracker using Notion as backend",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        {children}
      </body>
    </html>
  );
}
