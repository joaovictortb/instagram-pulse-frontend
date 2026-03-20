"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";

/**
 * Markdown estilizado para o Plano 7 dias: hierarquia clara, seções legíveis, fácil de aplicar no dia a dia.
 */
const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-12 first:mt-0 mb-5 flex items-start gap-3 scroll-mt-24">
      <span
        className="mt-1 h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-emerald-400 to-teal-600"
        aria-hidden
      />
      <span className="text-lg sm:text-xl font-bold text-white leading-snug pt-0.5">
        {children}
      </span>
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-3 rounded-xl border border-zinc-700/60 bg-zinc-900/70 px-4 py-3 text-base font-semibold text-emerald-300/95 shadow-sm">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-4 mb-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-[15px] sm:text-base text-zinc-300 leading-relaxed mb-4 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-100">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-zinc-400 not-italic font-medium">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="mb-5 space-y-3 pl-0 list-none">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 ml-5 list-decimal space-y-3 marker:font-semibold marker:text-emerald-500">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-[15px] sm:text-base text-zinc-300 leading-relaxed pl-6 relative before:absolute before:left-0 before:top-[0.55em] before:h-2 before:w-2 before:rounded-sm before:bg-emerald-500/70 before:content-['']">
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-4 border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 to-transparent py-4 px-5 rounded-r-2xl text-zinc-200 text-[15px] leading-relaxed">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-10 h-px border-0 bg-gradient-to-r from-transparent via-zinc-600/80 to-transparent" />
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-emerald-400 underline decoration-emerald-500/40 underline-offset-2 hover:text-emerald-300"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = /language-\w+/.test(className || "");
    if (isBlock) {
      return (
        <code
          className={`block w-full font-mono text-sm text-zinc-300 ${className || ""}`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[0.9em] text-emerald-200/90"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-xl border border-zinc-700/80 bg-zinc-950/90 p-4 text-sm shadow-inner">
      {children}
    </pre>
  ),
};

type Props = {
  markdown: string;
  className?: string;
};

export function GrowthPlanMarkdown({ markdown, className = "" }: Props) {
  return (
    <article
      className={`growth-plan-markdown max-w-none [&_ol_li]:before:hidden [&_ol_li]:pl-1 ${className}`}
      lang="pt-BR"
    >
      <ReactMarkdown components={components}>{markdown}</ReactMarkdown>
    </article>
  );
}
