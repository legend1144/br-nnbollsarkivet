type MarkdownContentProps = {
  markdown: string;
  className?: string;
};

function renderBlocks(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Array<{ type: "h2" | "h3" | "p" | "ul"; lines: string[] }> = [];

  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "p", lines: [paragraph.join("\n")] });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "ul", lines: [...listItems] });
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h3", lines: [line.slice(4)] });
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h2", lines: [line.slice(3)] });
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      listItems.push(line.slice(2));
      continue;
    }
    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

export function MarkdownContent({ markdown, className }: MarkdownContentProps) {
  const blocks = renderBlocks(markdown);
  return (
    <div className={`prose-lite ${className ?? ""}`.trim()}>
      {blocks.map((block, index) => {
        if (block.type === "h2") return <h2 key={index}>{block.lines[0]}</h2>;
        if (block.type === "h3") return <h3 key={index}>{block.lines[0]}</h3>;
        if (block.type === "ul") {
          return (
            <ul key={index}>
              {block.lines.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="whitespace-pre-line">
            {block.lines[0]}
          </p>
        );
      })}
    </div>
  );
}
