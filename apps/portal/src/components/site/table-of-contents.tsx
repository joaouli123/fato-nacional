"use client";

import { useEffect, useState, useRef } from "react";

type HeadingItem = {
  id: string;
  label: string;
};

export function TableOfContents({ items }: { items: HeadingItem[] }) {
  const [activeId, setActiveId] = useState<string>(() => items[0]?.id || "");
  const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number }>({ top: 0, height: 0 });
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { 
        rootMargin: "-80px 0px -70% 0px", // trigger when heading enters upper-middle portion of screen
        threshold: 0.1
      }
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => {
      items.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) observer.unobserve(el);
      });
    };
  }, [items]);

  useEffect(() => {
    if (!activeId) return;

    const updateIndicator = () => {
      const activeLinkEl = navRef.current?.querySelector(`.toc-link[href="#${activeId}"]`) as HTMLElement;
      if (activeLinkEl) {
        setIndicatorStyle({
          top: activeLinkEl.offsetTop,
          height: activeLinkEl.offsetHeight,
        });
      }
    };

    const frame = window.requestAnimationFrame(updateIndicator);
    
    // Recalculate on resize and layout changes
    window.addEventListener("resize", updateIndicator);
    const timer = setTimeout(updateIndicator, 100);

    return () => {
      window.removeEventListener("resize", updateIndicator);
      window.cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [activeId, items]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90; // offset to prevent the sticky header from blocking the section title
      const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveId(id);
    }
  };

  return (
    <div className="toc-wrapper">
      <span className="toc-title">Nesta Página</span>
      <nav className="toc-nav" ref={navRef}>
        <div
          className="toc-indicator"
          style={{
            transform: `translateY(${indicatorStyle.top}px)`,
            height: `${indicatorStyle.height}px`,
            opacity: activeId ? 1 : 0
          }}
        />
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => handleClick(e, item.id)}
            className={`toc-link ${activeId === item.id ? "active" : ""}`}
            title={item.label}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
