import type { ReactNode } from "react";

export function KnowledgeRichText({ value }: { value: string }) {
  const blocks = value.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return <div className="space-y-3 leading-7">{blocks.map((block, index) => {
    const heading = /^(#{1,3})\s+(.+)$/.exec(block);
    if (heading) return <h3 className="text-lg font-semibold" key={index}>{inlineContent(heading[2])}</h3>;
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const unordered = lines.every((line) => /^[-*]\s+/.test(line));
    const ordered = lines.every((line) => /^\d+[.)]\s+/.test(line));
    if (unordered) return <ul className="list-disc space-y-1 pl-6" key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{inlineContent(line.replace(/^[-*]\s+/, ""))}</li>)}</ul>;
    if (ordered) return <ol className="list-decimal space-y-1 pl-6" key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{inlineContent(line.replace(/^\d+[.)]\s+/, ""))}</li>)}</ol>;
    return <p key={index}>{lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br/>}{inlineContent(line)}</span>)}</p>;
  })}</div>;
}

function inlineContent(value: string): ReactNode {
  return value.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(part)) return <a className="font-semibold text-[var(--color-primary-dark)] underline" href={part} target="_blank" rel="noopener noreferrer" key={index}>{part}</a>;
    return <span key={index}>{part}</span>;
  });
}
