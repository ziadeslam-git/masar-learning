import { useMemo, type ReactNode } from 'react';
import { BookOpen, Info, Lightbulb } from 'lucide-react';

type Definition = { term: string; explanation: string };
type CalloutKind = 'definition' | 'example' | 'note';

export function estimateReadingMinutes(content: string) {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function parseDefinition(line: string): Definition | null {
  const colonIndex = line.search(/[:：]/u);
  if (colonIndex < 1 || colonIndex > 100) return null;
  const term = line.slice(0, colonIndex).replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
  const explanation = line.slice(colonIndex + 1).replace(/^\*\*/, '').trim();
  if (!term || !explanation || term.length > 80) return null;
  return { term, explanation };
}

function parseCallout(line: string): { kind: CalloutKind; body: string } | null {
  const match = line.match(/^\s*(?:\*\*)?(مثال|ملحوظة|تعريف)(?:(?:[:：]\s*\*\*)|(?:\*\*\s*[:：])|[:：])\s*(.*)$/u);
  if (!match) return null;
  const kind: CalloutKind = match[1] === 'مثال' ? 'example' : match[1] === 'ملحوظة' ? 'note' : 'definition';
  return { kind, body: match[2] };
}

function InlineMarkdown({ text }: { text: string }) {
  const segments = text.split(/(\*\*[^*]+\*\*|\([^()\n]*[A-Za-z][^()\n]*\))/g);
  return <>{segments.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const content = part.slice(2, -2);
      const isKeyword = /[:：]\s*$/u.test(content) || /^[：:]/u.test(segments[index + 1] ?? '');
      return <strong className={isKeyword ? 'markdown-keyword' : undefined} key={index}><InlineMarkdown text={content} /></strong>;
    }
    if (/^\([^()\n]*[A-Za-z][^()\n]*\)$/u.test(part)) {
      return <bdi className="markdown-english-token" dir="ltr" key={index}>{part}</bdi>;
    }
    return part;
  })}</>;
}

function Callout({ kind, lines }: { kind: CalloutKind; lines: string[] }) {
  const label = kind === 'example' ? 'مثال' : kind === 'note' ? 'ملحوظة' : 'تعريف';
  const icon: ReactNode = kind === 'example' ? <Lightbulb size={17} /> : kind === 'note' ? <Info size={17} /> : <BookOpen size={17} />;
  const bodyLines = [...(lines[0]?.replace(/^\s*(?:\*\*)?(?:مثال|ملحوظة|تعريف)(?:(?:[:：]\s*\*\*)|(?:\*\*\s*[:：])|[:：])\s*/u, '') ?? ''), ...lines.slice(1)].filter(Boolean);

  return <aside className={`lesson-callout lesson-callout-${kind}`} aria-label={label}>
    <div className="lesson-callout-heading">{icon}<span>{label}</span></div>
    <div className="lesson-callout-body">{bodyLines.map((line, index) => <p key={index}><InlineMarkdown text={line} /></p>)}</div>
  </aside>;
}

export function LessonMarkdown({ content, fontSize }: { content: string; fontSize: number }) {
  const blocks = useMemo(() => content.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean), [content]);

  return <div className="markdown-content" dir="rtl" data-testid="content-lesson-markdown" style={{ fontSize: `${fontSize}px` }}>
    {blocks.map((block, index) => {
      const lines = block.split('\n').map(line => line.trim()).filter(Boolean);

      if (lines.every(line => /^\|.*\|$/u.test(line))) {
        const rows = lines.filter(line => !/^\|[\s:|-]+\|$/u.test(line)).map(line => line.replace(/^\||\|$/gu, '').split('|').map(cell => cell.trim()));
        if (rows.length) return <div className="lesson-table-wrap" key={index}><table><thead><tr>{rows[0].map((cell, cellIndex) => <th key={cellIndex}><InlineMarkdown text={cell} /></th>)}</tr></thead><tbody>{rows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}><InlineMarkdown text={cell} /></td>)}</tr>)}</tbody></table></div>;
      }

      if (lines.every(line => /^>\s?/u.test(line))) {
        return <blockquote key={index}>{lines.map((line, lineIndex) => <p key={lineIndex}><InlineMarkdown text={line.replace(/^>\s?/u, '')} /></p>)}</blockquote>;
      }

      if (lines.every(line => /^[-*+]\s/u.test(line))) {
        return <ul key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}><InlineMarkdown text={line.replace(/^[-*+]\s/u, '')} /></li>)}</ul>;
      }

      if (lines.every(line => /^\d+[.)]\s/u.test(line))) {
        return <ol key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}><InlineMarkdown text={line.replace(/^\d+[.)]\s/u, '')} /></li>)}</ol>;
      }

      if (lines.length === 1 && /^#{1,6}\s/u.test(lines[0])) {
        const level = lines[0].match(/^#+/u)?.[0].length ?? 2;
        const text = lines[0].replace(/^#{1,6}\s/u, '');
        if (level === 1) return <h1 key={index}><InlineMarkdown text={text} /></h1>;
        if (level === 2) return <h2 key={index}><InlineMarkdown text={text} /></h2>;
        if (level === 3) return <h3 key={index}><InlineMarkdown text={text} /></h3>;
        return <h4 key={index}><InlineMarkdown text={text} /></h4>;
      }

      const callout = parseCallout(lines[0] ?? '');
      if (callout) return <Callout key={index} kind={callout.kind} lines={lines} />;

      const definitions = lines.map(parseDefinition);
      if (definitions.length && definitions.every((definition): definition is Definition => Boolean(definition))) {
        return <dl className="lesson-definition-list" key={index}>{definitions.map((definition, rowIndex) => <div className="lesson-definition-row" key={rowIndex}>
          <dt className="lesson-definition-term"><InlineMarkdown text={definition.term} /></dt>
          <dd><InlineMarkdown text={definition.explanation} /></dd>
        </div>)}</dl>;
      }

      return <p key={index}>{lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}<InlineMarkdown text={line} /></span>)}</p>;
    })}
  </div>;
}
