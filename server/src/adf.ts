import { randomUUID } from "node:crypto";
import { z } from "zod";

export const SectionSchema = z.object({
  heading: z.string().optional(),
  text: z.string().optional(),
  code: z.string().optional(),
  codeLanguage: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  actionItems: z.array(z.string()).optional(),
  links: z.array(z.object({ text: z.string(), href: z.string().url() })).optional(),
  panel: z.enum(["info", "note", "success", "warning", "error"]).optional(),
  dividerBefore: z.boolean().optional(),
  expand: z.boolean().optional(),
  expandTitle: z.string().optional(),
});

export type Section = z.infer<typeof SectionSchema>;
type Node = Record<string, unknown>;

const textNode = (text: string, marks?: Node[]): Node => ({ type: "text", text, ...(marks ? { marks } : {}) });
const paragraph = (text: string): Node => ({ type: "paragraph", content: text ? [textNode(text)] : [] });

function textToParagraphs(text: string): Node[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines.map(paragraph) : [paragraph("")];
}

function bodyNodes(sec: Section): Node[] {
  const nodes: Node[] = [];
  if (sec.text) nodes.push(...textToParagraphs(sec.text));
  if (sec.code) {
    nodes.push({
      type: "codeBlock",
      attrs: { language: sec.codeLanguage ?? "text" },
      content: [textNode(sec.code)],
    });
  }
  if (sec.bullets?.length) {
    nodes.push({
      type: "bulletList",
      content: sec.bullets.map((b) => ({ type: "listItem", content: [paragraph(b)] })),
    });
  }
  if (sec.actionItems?.length) {
    nodes.push({
      type: "taskList",
      attrs: { localId: randomUUID() },
      content: sec.actionItems.map((item) => ({
        type: "taskItem",
        attrs: { localId: randomUUID(), state: "TODO" },
        content: [textNode(item)],
      })),
    });
  }
  for (const ln of sec.links ?? []) {
    nodes.push({
      type: "paragraph",
      content: [textNode(ln.text, [{ type: "link", attrs: { href: ln.href } }, { type: "strong" }])],
    });
  }
  return nodes;
}

export function buildAdf(sections: Section[]): Node {
  const content: Node[] = [];
  for (const sec of sections) {
    if (sec.dividerBefore) content.push({ type: "rule" });
    if (sec.heading) {
      content.push({ type: "heading", attrs: { level: 3 }, content: [textNode(sec.heading)] });
    }
    const body = bodyNodes(sec);
    if (sec.expand) {
      content.push({
        type: "expand",
        attrs: { title: sec.expandTitle ?? "" },
        content: body.length ? body : [paragraph("")],
      });
      continue;
    }
    if (sec.panel && body.length) {
      content.push({ type: "panel", attrs: { panelType: sec.panel }, content: body });
    } else {
      content.push(...body);
    }
  }
  return { type: "doc", version: 1, content };
}
