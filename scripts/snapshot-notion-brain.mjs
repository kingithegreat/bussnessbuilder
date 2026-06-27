#!/usr/bin/env node
// Snapshot the Notion "BusinessFlow" brain into docs/brain-snapshot.md.
//
// Why: CLAUDE.md is the canonical working brain; this produces a durable,
// git-versioned backup/mirror of the Notion brief so it survives Notion edits
// or retention limits.
//
// Auth: needs a Notion internal-integration token in env NOTION_TOKEN, and the
// brain page must be shared with that integration. Page id comes from
// NOTION_BRAIN_PAGE_ID (falls back to the known BusinessFlow page). Neither the
// token nor anything secret is written into the output file.
//
// Usage: NOTION_TOKEN=ntn_xxx node scripts/snapshot-notion-brain.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const TOKEN = process.env.NOTION_TOKEN;
const PAGE_ID =
  process.env.NOTION_BRAIN_PAGE_ID || 'a72c8f26-a29a-40fd-9e23-febebc73e078';
const OUT = 'docs/brain-snapshot.md';
const NOTION_VERSION = '2022-06-28';

if (!TOKEN) {
  // Fail loudly: a backup job must never "succeed" without a token. A green run
  // with no backup is exactly the silent failure we want to avoid.
  console.error(
    '::error::NOTION_TOKEN is not set. Add it under repo Settings → Secrets and ' +
      'variables → Actions → Secrets, then re-run.',
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
};

async function api(path) {
  const res = await fetch(`https://api.notion.com/v1${path}`, { headers });
  if (!res.ok) {
    const body = await res.text();
    const hint =
      res.status === 401
        ? ' — invalid NOTION_TOKEN'
        : res.status === 403
          ? ' — integration lacks access (add it to the page via ••• → Connections)'
          : res.status === 404
            ? ' — page not found or not shared with the integration'
            : '';
    throw new Error(`Notion API ${res.status}${hint} on ${path}: ${body}`);
  }
  return res.json();
}

function richText(rt = []) {
  return rt
    .map((t) => {
      let s = t.plain_text ?? '';
      const a = t.annotations || {};
      if (a.code) s = '`' + s + '`';
      if (a.bold) s = `**${s}**`;
      if (a.italic) s = `*${s}*`;
      if (a.strikethrough) s = `~~${s}~~`;
      if (t.href) s = `[${s}](${t.href})`;
      return s;
    })
    .join('');
}

async function fetchChildren(blockId) {
  const blocks = [];
  let cursor;
  do {
    const qs = new URLSearchParams({ page_size: '100' });
    if (cursor) qs.set('start_cursor', cursor);
    const data = await api(`/blocks/${blockId}/children?${qs}`);
    blocks.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

const LIST_TYPES = ['bulleted_list_item', 'numbered_list_item', 'to_do', 'toggle'];

async function renderBlocks(blocks, indent = '') {
  let out = '';
  for (const b of blocks) out += await renderBlock(b, indent);
  return out;
}

async function renderBlock(b, indent) {
  const type = b.type;
  const data = b[type] || {};
  const text = richText(data.rich_text);
  let line = '';

  switch (type) {
    case 'heading_1':
      line = `\n# ${text}\n\n`;
      break;
    case 'heading_2':
      line = `\n## ${text}\n\n`;
      break;
    case 'heading_3':
      line = `\n### ${text}\n\n`;
      break;
    case 'paragraph':
      line = text ? `${indent}${text}\n\n` : '';
      break;
    case 'bulleted_list_item':
      line = `${indent}- ${text}\n`;
      break;
    case 'numbered_list_item':
      line = `${indent}1. ${text}\n`;
      break;
    case 'to_do':
      line = `${indent}- [${data.checked ? 'x' : ' '}] ${text}\n`;
      break;
    case 'toggle':
      line = `${indent}- ${text}\n`;
      break;
    case 'quote':
      line = `${indent}> ${text}\n\n`;
      break;
    case 'callout': {
      const emoji = data.icon?.emoji ? `${data.icon.emoji} ` : '';
      line = `${indent}> ${emoji}${text}\n\n`;
      break;
    }
    case 'code': {
      const raw = (data.rich_text || []).map((r) => r.plain_text).join('');
      line = `\n\`\`\`${data.language || ''}\n${raw}\n\`\`\`\n\n`;
      break;
    }
    case 'divider':
      line = `\n---\n\n`;
      break;
    case 'child_page':
      line = `${indent}- 📄 ${data.title || 'Untitled subpage'}\n`;
      break;
    default:
      line = text ? `${indent}${text}\n\n` : '';
      break;
  }

  let childOut = '';
  if (b.has_children && type !== 'code') {
    const children = await fetchChildren(b.id);
    const childIndent = LIST_TYPES.includes(type) ? `${indent}  ` : indent;
    childOut = await renderBlocks(children, childIndent);
  }
  return line + childOut;
}

function pageTitle(page) {
  const props = page.properties || {};
  for (const key of Object.keys(props)) {
    if (props[key].type === 'title') {
      return richText(props[key].title) || 'Notion Brain';
    }
  }
  return 'Notion Brain';
}

async function main() {
  const page = await api(`/pages/${PAGE_ID.replace(/-/g, '')}`);
  const title = pageTitle(page);
  const body = (await renderBlocks(await fetchChildren(PAGE_ID))).trimEnd();

  // Guard against writing an empty/partial backup (e.g. the integration can read
  // the page object but not its blocks). Better to fail loudly than overwrite a
  // good backup with nothing.
  if (body.replace(/\s/g, '').length < 100) {
    throw new Error(
      `Refusing to write snapshot: Notion returned little/no content ` +
        `(${body.length} chars). Confirm the integration has access to the page body.`,
    );
  }

  const url = `https://www.notion.so/${PAGE_ID.replace(/-/g, '')}`;
  const stamp = new Date().toISOString();

  const content = `<!-- AUTO-GENERATED — DO NOT EDIT BY HAND.
Regenerated by .github/workflows/snapshot-notion-brain.yml from the Notion
"${title}" brain. The canonical working brain is CLAUDE.md; this file is a
durable, git-versioned backup/mirror of the Notion brief.
Last generated (UTC): ${stamp} -->

# ${title} — Notion brain snapshot

> Durable backup/mirror of the Notion brief ([source](${url})).
> Canonical working brain is [\`CLAUDE.md\`](../CLAUDE.md). Regenerate via the
> **Snapshot Notion brain** GitHub Action (scheduled + manual).

${body}
`;

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, content, 'utf8');
  console.log(`Wrote ${OUT} (${content.length} bytes) from Notion page ${PAGE_ID}.`);
}

main().catch((err) => {
  console.error(`::error::Brain snapshot failed: ${err.message}`);
  process.exit(1);
});
