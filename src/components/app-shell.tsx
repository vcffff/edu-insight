"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BrainCircuit,
  Database,
  GraduationCap,
  LayoutGrid,
  Menu,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { DataSourceToggle, SourceErrorBanner } from "./data-source-toggle";

const navigation = [
  { href: "/", name: "Обзор", icon: LayoutGrid },
  { href: "/topic-analytics", name: "Аналитика тем", icon: BarChart3 },
  { href: "/curriculum-optimizer", name: "Оптимизатор программы", icon: SlidersHorizontal },
  { href: "/recommendations", name: "Рекомендации", icon: BrainCircuit },
  { href: "/datasets", name: "Данные", icon: Database },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const current = navigation.find((item) => item.href === path);
  return (
    <>
      <a href="#main-content" className="sr-only fixed left-3 top-3 z-[100] rounded-lg bg-primary px-4 py-2 text-white focus:not-sr-only">
        Перейти к содержимому
      </a>
      {open && <button aria-label="Закрыть навигацию" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-on-surface/30 lg:hidden" />}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 border-r border-outline-variant/30 bg-white transition-transform lg:translate-x-0",
        !open && "invisible -translate-x-full lg:visible",
      )}>
        <Link href="/" onClick={() => setOpen(false)} className="app-brand flex h-16 items-center gap-2.5 border-b border-outline-variant/20 px-4">
          <GraduationCap size={27} className="app-brand-mark shrink-0 text-primary" />
          <span className="font-heading text-lg font-semibold tracking-tight">EduInsight AI</span>
        </Link>
        <nav aria-label="Основная навигация" className="app-navigation space-y-1 p-3">
          {navigation.map(({ href, name, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={path === href ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-medium transition-colors",
                path === href ? "bg-primary-container text-white" : "text-secondary hover:bg-surface-container-low hover:text-on-surface",
              )}>
              <Icon size={18} strokeWidth={1.8} />
              {name}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-60">
        <header className="app-header sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-outline-variant/30 bg-white/95 px-4 backdrop-blur-md sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Открыть навигацию" onClick={() => setOpen(true)}><Menu /></Button>
            <Link href="/" className="truncate text-sm font-semibold lg:hidden">EduInsight AI</Link>
            <span className="hidden truncate text-sm font-medium lg:block">{current?.name ?? "EduInsight AI"}</span>
          </div>
          <DataSourceToggle />
        </header>
        <main id="main-content" className="mx-auto w-full max-w-[1600px] space-y-4 px-4 py-5 sm:px-6 xl:px-8">
          <SourceErrorBanner />
          <div className="app-content space-y-4">{children}</div>
        </main>
      </div>
      {open && <button aria-label="Закрыть боковое меню" onClick={() => setOpen(false)} className="fixed left-[248px] top-4 z-50 rounded-lg bg-white p-2 lg:hidden"><X size={18} /></button>}
    </>
  );
}
