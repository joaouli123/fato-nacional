"use client";

import { ArrowUp } from "lucide-react";

export function ScrollToTopButton() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <button 
      onClick={scrollToTop}
      className="scroll-to-top-floating-btn"
      aria-label="Voltar ao Topo"
    >
      <ArrowUp size={18} />
      <span>TOP</span>
    </button>
  );
}
