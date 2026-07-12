import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata = {
  title: "TimePath - Prototipo",
  description: "Fracciona tus proyectos académicos en micro-tareas diarias",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${inter.variable} flex items-center justify-center min-h-screen sm:py-8 sm:px-4 relative overflow-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
