"use client"

import React from 'react';

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; start: number; items: string[] }
  | { kind: 'rule' };

const MARKDOWN_HINTS = [
  /(^|\s)#{1,6}[ \t]+\S/,
  /\*\*[^*\n]+\*\*/,
  /(^|\n)[ \t]*[-+][ \t]+\S/,
  /(^|\n)[ \t]*\d+[.)][ \t]+\S/,
  /(^|\n)[ \t]*-{3,}[ \t]*(\n|$)/,
  /`[^`\n]+`/,
  /\[[^\]\n]+\]\([^)\s]+\)/,
];

const INLINE_BULLET = /(^|\s)\*(?!\*)[ \t]+(?=\S)/g;

const CLOSING_HASHES = /[ \t]+#{1,6}(?=\s|$)/g;

function countInlineBullets(text: string): number {
  return (text.match(INLINE_BULLET) || []).length;
}

export function hasMarkdownSyntax(text: string): boolean {
  if (!text) return false;
  return MARKDOWN_HINTS.some((pattern) => pattern.test(text)) || countInlineBullets(text) >= 2;
}

export function markdownToPlainText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/```/g, '')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/!?\[([^\]\n]+)\]\([^)\s]+\)/g, '$1')
    .replace(/(^|\s)#{1,6}[ \t]+/g, '$1')
    .replace(CLOSING_HASHES, '')
    .replace(/(^|\n)[ \t]*-{3,}[ \t]*(?=\n|$)/g, '$1')
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function markdownToSnippet(text: string, limit = 150): string {
  const plain = markdownToPlainText(text);
  if (plain.length <= limit) return plain;

  const clipped = plain.slice(0, limit);
  const lastSpace = clipped.lastIndexOf(' ');
  const head = lastSpace > limit / 2 ? clipped.slice(0, lastSpace) : clipped;
  return `${head.replace(/[\s.,;:!?-]+$/, '')}…`;
}

const TITLE_CONNECTORS = new Set([
  'a', 'an', 'and', 'or', 'of', 'the', 'to', 'for', 'in', 'on', 'with',
  'at', 'by', 'from', 'as', 'per', 'via', 'vs', 'into', 'over', 'under',
]);

const stripEdgePunctuation = (word: string) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

const opensSentence = (word: string) => /^\p{Lu}/u.test(stripEdgePunctuation(word));

const continuesSentence = (word: string) => {
  const bare = stripEdgePunctuation(word);
  return /^\p{Ll}/u.test(bare) && !TITLE_CONNECTORS.has(bare.toLowerCase());
};

function splitHeadingLine(content: string): { heading: string; body: string } {
  const trimmed = content.trim();
  if (trimmed.length <= 80) return { heading: trimmed, body: '' };

  const words = trimmed.split(/\s+/);
  const limit = Math.min(words.length - 1, 14);
  for (let i = 1; i < limit; i++) {
    if (opensSentence(words[i]) && continuesSentence(words[i + 1])) {
      return { heading: words.slice(0, i).join(' '), body: words.slice(i).join(' ') };
    }
  }
  return { heading: trimmed, body: '' };
}

function normalize(raw: string): string {
  const text = raw
    .replace(/\r\n?/g, '\n')
    .trim()
    .replace(/(\S)[ \t]+(#{1,6}[ \t]+)/g, '$1\n\n$2')
    .replace(/([.:!?])[ \t]+(\*\*[^*\n]{2,160}\*\*)/g, '$1\n\n$2')
    .replace(/(\S)[ \t]+(-{3,})(?=[ \t]|$)/g, '$1\n\n$2\n');

  if (countInlineBullets(text) < 2) return text;
  return text.replace(/(\S)[ \t]+\*(?!\*)[ \t]+(?=\S)/g, '$1\n* ');
}

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; start: number; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ kind: 'list', ...list });
      list = null;
    }
  };
  const flush = () => {
    flushParagraph();
    flushList();
  };

  for (const rawLine of normalize(source).split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }

    const heading = line.match(/^(#{1,6})[ \t]+(.+)$/);
    if (heading) {
      flush();
      const { heading: title, body } = splitHeadingLine(heading[2].replace(CLOSING_HASHES, ''));
      blocks.push({ kind: 'heading', level: heading[1].length, text: title });
      if (body) paragraph.push(body);
      continue;
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flush();
      blocks.push({ kind: 'rule' });
      continue;
    }

    const bullet = line.match(/^[*\-+][ \t]+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, start: 1, items: [] };
      }
      list.items.push(bullet[1].trim());
      continue;
    }

    const ordered = line.match(/^(\d+)[.)][ \t]+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, start: Number(ordered[1]) || 1, items: [] };
      }
      list.items.push(ordered[2].trim());
      continue;
    }

    if (list) {
      list.items[list.items.length - 1] += `\n${line}`;
      continue;
    }
    paragraph.push(line);
  }
  flush();

  return blocks.flatMap(promoteNumberedSection);
}

function promoteNumberedSection(block: Block): Block[] {
  if (block.kind !== 'list' || !block.ordered || block.items.length !== 1) return [block];

  const { heading, body } = splitHeadingLine(block.items[0]);
  if (!body) return [block];
  return [
    { kind: 'heading', level: 3, text: `${block.start}. ${heading}` },
    { kind: 'paragraph', text: body },
  ];
}

const INLINE_SOURCE = /\*\*(?=\S)([\s\S]*?\S)\*\*|\*(?=\S)([^*\n]*?\S)\*|`([^`\n]+)`|\[([^\]\n]+)\]\(([^)\s]+)\)|https?:\/\/[^\s<>()[\]]+/;

const isSafeHref = (href: string) => /^(https?:\/\/|mailto:|\/)/i.test(href);

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = new RegExp(INLINE_SOURCE.source, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const key = `${keyPrefix}-${match.index}`;
    const [full, bold, italic, code, linkText, linkHref] = match;

    if (bold !== undefined) {
      nodes.push(<strong key={key}>{renderInline(bold, key)}</strong>);
    } else if (italic !== undefined) {
      nodes.push(<em key={key}>{renderInline(italic, key)}</em>);
    } else if (code !== undefined) {
      nodes.push(<code key={key}>{code}</code>);
    } else if (linkText !== undefined && isSafeHref(linkHref)) {
      nodes.push(<a key={key} href={linkHref} target="_blank" rel="noopener noreferrer">{linkText}</a>);
    } else if (linkText !== undefined) {
      nodes.push(full);
    } else {
      nodes.push(<a key={key} href={full} target="_blank" rel="noopener noreferrer">{full}</a>);
    }
    lastIndex = match.index + full.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes;
}

function renderBlock(block: Block, index: number): React.ReactNode {
  const key = `block-${index}`;

  switch (block.kind) {
    case 'heading': {
      const Tag = (block.level <= 3 ? 'h4' : block.level === 4 ? 'h5' : 'h6') as 'h4' | 'h5' | 'h6';
      return <Tag key={key}>{renderInline(block.text, key)}</Tag>;
    }
    case 'list': {
      const items = block.items.map((item, itemIndex) => (
        <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
      ));
      return block.ordered
        ? <ol key={key} start={block.start}>{items}</ol>
        : <ul key={key}>{items}</ul>;
    }
    case 'rule':
      return <hr key={key} />;
    default:
      return <p key={key}>{renderInline(block.text, key)}</p>;
  }
}

type Props = {
  text: string;
  className?: string;
};

const MarkdownText = React.forwardRef<HTMLDivElement, Props>(function MarkdownText({ text, className }, ref) {
  const blocks = React.useMemo(() => parseBlocks(text), [text]);

  return (
    <div ref={ref} className={className ? `markdown-body ${className}` : 'markdown-body'}>
      {blocks.map(renderBlock)}
    </div>
  );
});

export default MarkdownText;
