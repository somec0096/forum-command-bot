const { Client, GatewayIntentBits, ChannelType } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const GUILD_ID = "1361734105699713137"; // 你的服务器ID（已填好）
const ACTION = process.env.ACTION; // 'open' 或 'close'
const FORUM_IDS = process.env.FORUM_IDS; // 论坛ID列表，用英文逗号分隔，例如 "111,222,333"

if (!ACTION || !FORUM_IDS) {
  console.error("❌ 请设置环境变量 ACTION 和 FORUM_IDS");
  process.exit(1);
}
if (ACTION !== "open" && ACTION !== "close") {
  console.error('❌ ACTION 必须是 "open" 或 "close"');
  process.exit(1);
}

// 将逗号分隔的字符串转换为数组，并去除可能的空格
const forumIdList = FORUM_IDS.split(",").map((id) => id.trim());

client.once("ready", async () => {
  console.log(`✅ 机器人 ${client.user.tag} 已启动，执行操作: ${ACTION}`);
  console.log(`📋 待处理的论坛数量: ${forumIdList.length}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.channels.fetch(); // 确保频道缓存完整

    for (const forumId of forumIdList) {
      const forum = guild.channels.cache.get(forumId);
      if (!forum || !forum.isThreadOnly()) {
        console.error(`❌ 无效的论坛ID: ${forumId}，跳过`);
        continue;
      }

      console.log(`\n📌 处理论坛: ${forum.name} (ID: ${forum.id})`);

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
        console.log(`  ✨ 论坛 ${forum.name} 激活完成，共 ${total} 个帖子`);
      } else {
        // close
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
        console.log(`  ✨ 论坛 ${forum.name} 归档完成，共 ${total} 个帖子`);
      }
    }

    console.log("\n🎉 所有论坛处理完毕！");
  } catch (error) {
    console.error("❌ 执行过程中发生错误:", error);
  } finally {
    client.destroy();
    console.log("机器人已断开连接，任务结束。");
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
