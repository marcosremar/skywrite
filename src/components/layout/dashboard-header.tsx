"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { PageTitleDisplay, PageTitleProvider } from "@/components/ui/page-title";
import { cn } from "@/lib/utils";

// Icons
const Icons = {
  folder: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  ),
  layout: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <line x1="3" x2="21" y1="9" y2="9" />
      <line x1="9" x2="9" y1="21" y2="9" />
    </svg>
  ),
  settings: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  creditCard: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  ),
  logOut: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  ),
};

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  children: React.ReactNode;
  signOutAction: () => Promise<void>;
}

export function DashboardHeader({ user, children, signOutAction }: DashboardHeaderProps) {
  const pathname = usePathname();
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const isActive = (path: string) => pathname?.startsWith(path);

  return (
    <PageTitleProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0d0d12]/95 backdrop-blur-xl">
          <div className="flex h-12 items-center px-4">
            {/* Left: Logo + Nav */}
            <div className="flex items-center gap-1">
              <Link href="/projects" className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
                <Logo size="sm" />
              </Link>

              <div className="h-4 w-px bg-white/10 mx-2 hidden md:block" />

              <nav className="hidden md:flex items-center">
                <Link href="/projects">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-3 gap-2 text-xs font-medium transition-colors",
                      isActive("/projects")
                        ? "text-white bg-white/10"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icons.folder className="w-3.5 h-3.5" />
                    Projetos
                  </Button>
                </Link>
                <Link href="/templates">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-3 gap-2 text-xs font-medium transition-colors",
                      isActive("/templates")
                        ? "text-white bg-white/10"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icons.layout className="w-3.5 h-3.5" />
                    Templates
                  </Button>
                </Link>
              </nav>
            </div>

            {/* Center: Page Title */}
            <div className="flex-1 flex justify-center">
              <PageTitleDisplay />
            </div>

            {/* Right: User Menu */}
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full ring-1 ring-white/10 hover:ring-white/20 transition-all"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image || ""} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-[#1a1a24] border-white/10"
                >
                  <div className="flex items-center gap-3 p-3 border-b border-white/10">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.image || ""} />
                      <AvatarFallback className="text-sm bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      {user.name && (
                        <p className="font-medium text-sm text-white truncate">{user.name}</p>
                      )}
                      {user.email && (
                        <p className="text-xs text-white/50 truncate">{user.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="p-1">
                    <DropdownMenuItem asChild className="gap-2 px-3 py-2 cursor-pointer">
                      <Link href="/settings">
                        <Icons.settings className="w-4 h-4 text-white/50" />
                        <span>Configuracoes</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="gap-2 px-3 py-2 cursor-pointer">
                      <Link href="/billing">
                        <Icons.creditCard className="w-4 h-4 text-white/50" />
                        <span>Plano</span>
                      </Link>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <div className="p-1">
                    <DropdownMenuItem asChild className="gap-2 px-3 py-2 cursor-pointer text-red-400 focus:text-red-400">
                      <form action={signOutAction}>
                        <button className="w-full flex items-center gap-2 text-left">
                          <Icons.logOut className="w-4 h-4" />
                          <span>Sair</span>
                        </button>
                      </form>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>{children}</main>
      </div>
    </PageTitleProvider>
  );
}
