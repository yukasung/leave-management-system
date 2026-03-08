import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar, { type CurrentUser } from "@/app/components/Navbar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Leave Management System",
  description: "Modern leave management for HR teams",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth()
  let currentUser: CurrentUser | null = null

  if (session?.user?.id) {
    const [dbUser, reportCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { avatarUrl: true },
      }),
      // Check if this user is a direct manager of any employee
      prisma.employee.count({ where: { manager: { userId: session.user.id } } }),
    ])
    currentUser = {
      id:         session.user.id,
      name:       session.user.name ?? '',
      email:      session.user.email ?? '',
      isAdmin:    session.user.isAdmin,
      avatarUrl:  dbUser?.avatarUrl ?? null,
      hasReports: reportCount > 0,
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <Navbar currentUser={currentUser} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
