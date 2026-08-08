import katex from 'katex';

// Custom parser to map TeX math tokens to KaTeX HTML strings
function parseLatex(text: string): string {
  // 1. Split by block math $$
  const blockParts = text.split('$$');
  const renderedBlocks = blockParts.map((block, index) => {
    const isBlockMath = index % 2 === 1;
    if (isBlockMath) {
      try {
        return katex.renderToString(block, { displayMode: true, throwOnError: false });
      } catch (err) {
        return `$$${block}$$`;
      }
    } else {
      // 2. Split by inline math $
      const inlineParts = block.split('$');
      return inlineParts.map((inline, idx) => {
        const isInlineMath = idx % 2 === 1;
        if (isInlineMath) {
          try {
            return katex.renderToString(inline, { displayMode: false, throwOnError: false });
          } catch (err) {
            return `$${inline}$`;
          }
        } else {
          return inline;
        }
      }).join('');
    }
  });

  return renderedBlocks.join('');
}

export default function Latex({ text, className = '' }: { text: string; className?: string }) {
  const renderedText = text || '';

  // Parse paragraphs and insert LaTeX HTML instantly
  const paragraphs = renderedText.split('\n');

  return (
    <div className={className} style={{ wordBreak: 'break-word' }}>
      {paragraphs.map((para, i) => {
        const html = parseLatex(para);
        return (
          <p
            key={i}
            className={i > 0 ? 'mt-2' : ''}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </div>
  );
}
