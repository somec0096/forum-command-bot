const { Client, GatewayIntentBits, ChannelType } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds], // 只需要读取服务器和频道信息，不需要消息相关
});

const GUILD_ID = "1361734105699713137"; // 你的服务器ID（请确认）
const ACTION = process.env.ACTION; // 从环境变量读取：'open' 或 'close'
const FORUM_ID = process.env.FORUM_ID; // 从环境变量读取：目标论坛频道ID

// 检查必要的环境变量
if (!ACTION || !FORUM_ID) {
  console.error("❌ 请设置环境变量 ACTION 和 FORUM_ID");
  process.exit(1);
}
if (ACTION !== "open" && ACTION !== "close") {
  console.error('❌ ACTION 必须是 "open" 或 "close"');
  process.exit(1);
}

client.once("ready", async () => {
  console.log(`✅ 机器人 ${client.user.tag} 已启动，执行操作: ${ACTION}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const forum = guild.channels.cache.get(FORUM_ID);

    if (!forum || !forum.isThreadOnly()) {
      console.error("❌ 找不到指定的论坛频道，或该频道不是论坛类型");
      process.exit(1);
    }

    console.log(`📌 目标论坛: ${forum.name} (ID: ${forum.id})`);

    if (ACTION === "open") {
      // 激活所有归档帖子
      let total = 0;
      let lastId = null;
      let hasMore = true;

      while (hasMore) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const fetched = await forum.threads.fetchArchived(options);
        const threads = Array.from(fetched.threads.values());

        for (const thread of threads) {
          if (thread.archived) {
            await thread.setArchived(false);
            total++;
            console.log(`  ✅ 激活: ${thread.name}`);
          }
        }

        hasMore = fetched.hasMore;
        if (hasMore && threads.length > 0) {
          lastId = threads[threads.length - 1].id;
        }
      }

      console.log(`\n✨ 总共激活了 ${total} 个归档帖子。`);
    } else {
      // close
      // 归档所有活跃帖子
      const active = await forum.threads.fetchActive();
      const threads = Array.from(active.threads.values());
      let total = 0;

      for (const thread of threads) {
        if (!thread.archived) {
          await thread.setArchived(true);
          total++;
          console.log(`  ✅ 归档: ${thread.name}`);
        }
      }

      console.log(`\n✨ 总共归档了 ${total} 个活跃帖子。`);
    }
  } catch (error) {
    console.error("❌ 执行过程中发生错误:", error);
  } finally {
    client.destroy();
    console.log("机器人已断开连接，任务结束。");
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
