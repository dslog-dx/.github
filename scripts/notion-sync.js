const fs = require('fs');
const path = require('path');
// require('notion-client') ではなく、公式の SDK を確実に呼び出す
const { Client } = require('@notionhq/client');

async function sync() {
  const { NOTION_API_KEY, NOTION_DATABASE_ID, REPO_NAME, ISSUE_TITLE, ISSUE_URL, ISSUE_STATE } = process.env;
  
  // 初期化をより安全に行う
  if (!NOTION_API_KEY) {
    console.error("❌ NOTION_API_KEY is missing");
    process.exit(1);
  }

  const notion = new Client({ auth: NOTION_API_KEY });

  // 1. JSONマップの読み込み
  const mapPath = path.join(__dirname, '../config/repo-map.json');
  let projectDisplayName = REPO_NAME;

  try {
    if (fs.existsSync(mapPath)) {
      const repoMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      projectDisplayName = repoMap[REPO_NAME] || REPO_NAME;
    }
  } catch (e) {
    console.log("⚠️ Mapping file invalid or not found.");
  }

  try {
    console.log(`Searching for Issue URL: ${ISSUE_URL}`);
    
    // 命令が確実に存在するかチェック（デバッグ用）
    if (!notion.databases || typeof notion.databases.query !== 'function') {
      throw new Error("Notion SDK initialized incorrectly: databases.query is not a function");
    }

    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      filter: {
        property: "GitHub ID",
        rich_text: { equals: ISSUE_URL }
      }
    });

    if (response.results && response.results.length > 0) {
      await notion.pages.update({
        page_id: response.results[0].id,
        properties: {
          "ステータス": { select: { name: (ISSUE_STATE === "open" ? "進行中" : "完了") } }
        }
      });
      console.log("✨ Updated existing task.");
    } else {
      await notion.pages.create({
        parent: { database_id: NOTION_DATABASE_ID },
        properties: {
          "タスク名": { title: [{ text: { content: ISSUE_TITLE } }] },
          "プロジェクト名": { select: { name: projectDisplayName } },
          "GitHub ID": { rich_text: [{ text: { content: ISSUE_URL } }] },
          "ステータス": { select: { name: "未着手" } }
        }
      });
      console.log("🚀 Created new task.");
    }
  } catch (error) {
    console.error("❌ Notion API Error Details:");
    console.error(error.message);
    process.exit(1);
  }
}

sync();
