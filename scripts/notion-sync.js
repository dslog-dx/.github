const fs = require('fs');
const path = require('path');
const { Client } = require('@notionhq/client');

async function sync() {
  const { NOTION_API_KEY, NOTION_DATABASE_ID, REPO_NAME, ISSUE_TITLE, ISSUE_URL, ISSUE_STATE } = process.env;
  
  // Clientの初期化を確認
  const notion = new Client({ auth: NOTION_API_KEY });

  // 1. JSONマップの読み込みパスを調整
  // 実行環境が .github-repo であることを考慮したパスにします
  const mapPath = path.join(__dirname, '../config/repo-map.json');
  let projectDisplayName = REPO_NAME;

  if (fs.existsSync(mapPath)) {
    try {
      const repoMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      projectDisplayName = repoMap[REPO_NAME] || REPO_NAME;
      console.log(`✅ Mapped: ${REPO_NAME} -> ${projectDisplayName}`);
    } catch (e) {
      console.log("⚠️ Mapping file invalid, using repo name.");
    }
  }

  try {
    // 2. 検索実行
    console.log(`Searching for Issue URL: ${ISSUE_URL}`);
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      filter: {
        property: "GitHub ID",
        rich_text: { equals: ISSUE_URL }
      }
    });

    if (response.results && response.results.length > 0) {
      // 【更新】
      const pageId = response.results[0].id;
      await notion.pages.update({
        page_id: pageId,
        properties: {
          "ステータス": { select: { name: (ISSUE_STATE === "open" ? "進行中" : "完了") } }
        }
      });
      console.log("✨ Updated existing task.");
    } else {
      // 【新規作成】
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
    console.error("❌ Notion API Error:");
    console.error(error.message);
    process.exit(1);
  }
}

sync();
