#!/usr/bin/env node
// Snapshot the Notion brain pages into git-versioned Markdown backups:
//   - "💼 BusinessFlow" brief        → docs/brain-snapshot.md
//   - "📚 Lessons & Playbook" rules  → docs/playbook-snapshot.md
//
// Why: CLAUDE.md is the canonical working brain; these produce durable,
// git-versioned backups/mirrors of the Notion pages so they survive Notion
// edits or retention limits.
//
// Auth: needs a Notion internal-integration token in env NOTION_TOKEN, and each
// page must be shared with that integration (sharing the parent "Aden Brain"
// hub covers children). Page ids come from NOTION_BRAIN_PAGE_ID /
// NOTION_PLAYBOOK_PAGE_ID (falling back to the known pages). Neither the token
// nor anything secret is written into the output files.
//
// Usage: NOTION_TOKEN=ntn_xxx node scripts/snapshot-notion-brain.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

const TARGETS = [
  {
    pageId:
      process.env.NOTION_BRAIN_PAGE_ID ||
      'a72c8f26-a29a-40fd-9e23-febebc73e078',
    out: 'docs/brain-snapshot.md',
    blurb: 'the Notion brief',
  },
  {
    pageId:
      process.env.NOTION_PLAYBOOK_PAGE_ID ||
      '38f829eb-f7be-81c5-a62c-cb3bdb63c603',
    out: 'docs/playbook-snapshot.md',
    blurb: 'the Lessons & Playbook rulebook',
  },
];

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
    case 'table': {
      // Render the whole table here (children are table_row blocks) so we can
      // emit the Markdown header separator; skip the generic child pass below.
      const rows = await fetchChildren(b.id);
      const rendered = rows.map((r) => {
        const cells = (r.table_row?.cells || []).map((c) =>
          richText(c).replaceAll('|', '\\|').replaceAll('\n', ' '),
        );
        return `${indent}| ${cells.join(' | ')} |`;
      });
      if (rendered.length > 0) {
        const width = rows[0].table_row?.cells?.length || 1;
        rendered.splice(1, 0, `${indent}|${' --- |'.repeat(width)}`);
      }
      return `\n${rendered.join('\n')}\n\n`;
    }
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

async function snapshot({ pageId, out, blurb }) {
  const page = await api(`/pages/${pageId.replace(/-/g, '')}`);
  const title = pageTitle(page);
  const body = (await renderBlocks(await fetchChildren(pageId))).trimEnd();

  // Guard against writing an empty/partial backup (e.g. the integration can read
  // the page object but not its blocks). Better to fail loudly than overwrite a
  // good backup with nothing.
  if (body.replace(/\s/g, '').length < 100) {
    throw new Error(
      `Refusing to write ${out}: Notion returned little/no content ` +
        `(${body.length} chars). Confirm the integration has access to the page body.`,
    );
  }

  const url = `https://www.notion.so/${pageId.replace(/-/g, '')}`;
  const stamp = new Date().toISOString();

  const content = `<!-- AUTO-GENERATED — DO NOT EDIT BY HAND.
Regenerated by .github/workflows/snapshot-notion-brain.yml from the Notion
"${title}" page. The canonical working brain is CLAUDE.md; this file is a
durable, git-versioned backup/mirror of ${blurb}.
Last generated (UTC): ${stamp} -->

# ${title} — Notion brain snapshot

> Durable backup/mirror of ${blurb} ([source](${url})).
> Canonical working brain is [\`CLAUDE.md\`](../CLAUDE.md). Regenerate via the
> **Snapshot Notion brain** GitHub Action (scheduled + manual).

${body}
`;

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, content, 'utf8');
  console.log(`Wrote ${out} (${content.length} bytes) from Notion page ${pageId}.`);
}

async function main() {
  for (const target of TARGETS) await snapshot(target);
}

main().catch((err) => {
  console.error(`::error::Brain snapshot failed: ${err.message}`);
  process.exit(1);
});
