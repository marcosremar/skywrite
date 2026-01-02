"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface PageTitleContextType {
  title: string;
  subtitle: string;
  setTitle: (title: string, subtitle?: string) => void;
  clearTitle: () => void;
}

const PageTitleContext = createContext<PageTitleContextType | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState("");
  const [subtitle, setSubtitle] = useState("");

  const setTitle = (newTitle: string, newSubtitle?: string) => {
    setTitleState(newTitle);
    setSubtitle(newSubtitle || "");
  };

  const clearTitle = () => {
    setTitleState("");
    setSubtitle("");
  };

  return (
    <PageTitleContext.Provider value={{ title, subtitle, setTitle, clearTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle() {
  const context = useContext(PageTitleContext);
  // Return no-op functions if context is not available (graceful fallback)
  if (!context) {
    return {
      title: "",
      subtitle: "",
      setTitle: () => {},
      clearTitle: () => {},
    };
  }
  return context;
}

// Component to display the title in the header
export function PageTitleDisplay() {
  const { title, subtitle } = usePageTitle();

  if (!title) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <span className="text-xs text-white/50 truncate max-w-[180px] sm:max-w-[250px]">
        {title}
      </span>
      {subtitle && (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-xs font-medium text-white/80 truncate max-w-[120px]">{subtitle}</span>
        </>
      )}
    </div>
  );
}

// Hook to set the title from a page
export function useSetPageTitle(title: string, subtitle?: string) {
  const { setTitle, clearTitle } = usePageTitle();

  useEffect(() => {
    setTitle(title, subtitle);
    return () => clearTitle();
  }, [title, subtitle, setTitle, clearTitle]);
}
