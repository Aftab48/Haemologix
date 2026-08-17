import type { ReactNode } from "react";

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

function inlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={index}>{bold[1]}</strong>;

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = link[2].trim();
      if (/^(https?:\/\/|mailto:)/i.test(href)) {
        return <a key={index} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>{link[1]}</a>;
      }
    }
    return part;
  });
}

function parseMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const items: string[] = [];
      while (index < lines.length) {
        const candidate = lines[index].trim();
        const match = ordered ? candidate.match(/^\d+[.)]\s+(.+)$/) : candidate.match(/^[-*]\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    if (line.startsWith("> ")) {
      blocks.push({ type: "quote", text: line.slice(2) });
      index += 1;
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim()) {
      const candidate = lines[index].trim();
      if (/^(#{1,3})\s+|^[-*]\s+|^\d+[.)]\s+|^>\s+/.test(candidate)) break;
      paragraph.push(candidate);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

export default function JobDescription({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <div className={className}>
      {parseMarkdown(markdown).map((block, index) => {
        if (block.type === "heading") {
          if (block.level === 1) return <h2 key={index}>{inlineMarkdown(block.text)}</h2>;
          if (block.level === 2) return <h2 key={index}>{inlineMarkdown(block.text)}</h2>;
          return <h3 key={index}>{inlineMarkdown(block.text)}</h3>;
        }
        if (block.type === "quote") return <blockquote key={index}>{inlineMarkdown(block.text)}</blockquote>;
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return <List key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{inlineMarkdown(item)}</li>)}</List>;
        }
        return <p key={index}>{inlineMarkdown(block.text)}</p>;
      })}
    </div>
  );
}
