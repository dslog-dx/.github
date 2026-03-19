const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function sync() {
  const databaseId = process.env.NOTION_DATABASE_ID;
  const repoName = process.env.REPO_NAME;
  const issueUrl = process.env.ISSUE_URL;
  const title = process.env.ISSUE_TITLE;
  const state = process.env.ISSUE_STATE;

  // 1. 既存のタスクを「GitHub ID (URL)」で検索
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: { property: "GitHub ID", rich_text: { equals: issueUrl } }
  });

  if (response.results.length > 0) {
    // 【更新】すでにあるならステータスを書き換える
    const pageId = response.results[0].id;
    await notion.pages.update({
      page_id: pageId,
      properties: {
        "ステータス": { select: { name: (state === "open" ? "進行中" : "完了") } }
      }
    });
    console.log(`Updated: ${title}`);
  } else {
    // 【新規】なければ新しく作る
    await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        "タスク名": { title: [{ text: { content: title } }] },
        "プロジェクト名": { select: { name: repoName } },
        "GitHub ID": { rich_text: [{ text: { content: issueUrl } }] },
        "ステータス": { select: { name: "未着手" } }
      }
    });
    console.log(`Created: ${title}`);
  }
}

sync().catch(console.error);
