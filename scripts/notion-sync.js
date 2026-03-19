const fs = require('fs');
const path = require('path');
const { Client } = require('@notionhq/client');

// 環境変数の読み込み
const {
  NOTION_API_KEY,
  NOTION_DATABASE_ID,
  REPO_NAME,
  ISSUE_TITLE,
  ISSUE_URL,
  ISSUE_STATE
} = process.env;

const notion = new Client({ auth: NOTION_API_KEY });

async function sync() {
  // 1. JSONマップの読み込み
  const mapPath = path.join(__dirname, '../config/repo-map.json');
  let projectDisplayName = REPO_NAME; // デフォルトはリポジトリ名

  try {
    const repoMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    if (repoMap[REPO_NAME]) {
      projectDisplayName = repoMap[REPO_NAME];
    }
  } catch (e) {
    console.log("Mapping file not found or invalid, using repo name instead.");
  }

  // 2. 既存タスクを GitHub ID (URL) で検索
  const response = await notion.databases.query({
    database_id: NOTION_DATABASE_ID,
    filter: {
      property: "GitHub ID",
      rich_text: { equals: ISSUE_URL }
    }
  });

  if (response.results.length > 0) {
    // 【更新】既存ページがある場合
    const pageId = response.results[0].id;
    await notion.pages.update({
      page_id: pageId,
      properties: {
        "ステータス": {
          select: { name: (ISSUE_STATE === "open" ? "進行中" : "完了") }
        }
      }
    });
    console.log(`Updated: ${projectDisplayName} - ${ISSUE_TITLE}`);
  } else {
    // 【新規】ページがない場合
    await notion.pages.create({
      parent: { database_id: NOTION_DATABASE_ID },
      properties: {
        "タスク名": {
          title: [{ text: { content: ISSUE_TITLE } }]
        },
        "プロジェクト名": {
          select: { name: projectDisplayName }
        },
        "GitHub ID": {
          rich_text: [{ text: { content: ISSUE_URL } }]
        },
        "ステータス": {
          select: { name: "未着手" }
        }
      }
    });
    console.log(`Created: ${projectDisplayName} - ${ISSUE_TITLE}`);
  }
}

sync().catch(err => {
  console.error(err);
  process.exit(1);
});
