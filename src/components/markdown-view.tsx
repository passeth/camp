import { getMarkdownHeadings } from "@/lib/markdown-headings";

function inlineFormat(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export function MarkdownView({ content }: { readonly content: string }) {
  const lines = content.split("\n");
  const headings = getMarkdownHeadings(content);
  let headingIndex = 0;
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let inCode = false;

  const flushList = () => {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={`ul-${nodes.length}`}>
          {listItems.map((item) => <li key={item}>{inlineFormat(item)}</li>)}
        </ul>,
      );
      listItems = [];
    }
  };

  const flushCode = () => {
    nodes.push(<pre key={`pre-${nodes.length}`}><code>{codeLines.join("\n")}</code></pre>);
    codeLines = [];
  };

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushList();
        inCode = true;
      }
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    if (!line.trim()) {
      flushList();
      return;
    }

    if (line.startsWith("# ")) {
      flushList();
      const heading = headings[headingIndex++];
      nodes.push(<h1 id={heading?.id} key={`h1-${nodes.length}`}>{inlineFormat(line.slice(2))}</h1>);
      return;
    }

    if (line.startsWith("## ")) {
      flushList();
      const heading = headings[headingIndex++];
      nodes.push(<h2 id={heading?.id} key={`h2-${nodes.length}`}>{inlineFormat(line.slice(3))}</h2>);
      return;
    }

    if (line.startsWith("### ")) {
      flushList();
      const heading = headings[headingIndex++];
      nodes.push(<h3 id={heading?.id} key={`h3-${nodes.length}`}>{inlineFormat(line.slice(4))}</h3>);
      return;
    }

    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      return;
    }

    flushList();
    nodes.push(<p key={`p-${nodes.length}`}>{inlineFormat(line)}</p>);
  });

  flushList();
  if (inCode && codeLines.length > 0) flushCode();

  return <div className="prose-lite post-body">{nodes}</div>;
}
