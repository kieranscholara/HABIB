import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import { curriculum, topicById } from "../src/lib/curriculum";
import { contentHash } from "../src/lib/family";
import { transaction, closeDatabase } from "../src/lib/data/db";
const [action, id, reviewer, outcome] = process.argv.slice(2);
if (action === "list") {
  for (const topic of curriculum)
    console.log(topic.id, topic.title.en, JSON.stringify(topic.exercises));
} else if (action === "approve" && id && reviewer && outcome) {
  const topic = topicById(id);
  if (!topic) throw new Error("Unknown topic");
  await transaction(async (db) => {
    await db.run(
      "INSERT INTO curriculum_reviews(topic_id,reviewer,reviewed_at,content_hash) VALUES(?,?,?,?) ON CONFLICT(topic_id) DO UPDATE SET reviewer=excluded.reviewer,reviewed_at=excluded.reviewed_at,content_hash=excluded.content_hash",
      [id, reviewer, new Date().toISOString(), contentHash(topic)],
    );
    if (process.env.APP_ENV === "production") {
      await db.run(
        "INSERT INTO curriculum_topics(id,year_group,title_mt,title_en,outcome_reference,published) VALUES(?,?,?,?,?,true) ON CONFLICT(id) DO UPDATE SET published=true,outcome_reference=excluded.outcome_reference",
        [id, topic.year, topic.title.mt, topic.title.en, outcome],
      );
      await db.run(
        "INSERT INTO lessons(id,topic_id,content_json,review_status,reviewed_at) VALUES(?,?,?,'approved',?) ON CONFLICT(id) DO UPDATE SET content_json=excluded.content_json,review_status='approved',reviewed_at=excluded.reviewed_at",
        [id + "-v1", id, JSON.stringify(topic), new Date().toISOString()],
      );
      for (let i = 0; i < topic.exercises.length; i++) {
        const e = topic.exercises[i];
        await db.run(
          "INSERT INTO questions(id,topic_id,prompt_mt,prompt_en,answer_json,approved) VALUES(?,?,?,?,?,true) ON CONFLICT(id) DO UPDATE SET prompt_mt=excluded.prompt_mt,prompt_en=excluded.prompt_en,answer_json=excluded.answer_json,approved=true",
          [
            `${id}:${i}`,
            id,
            e.prompt.mt,
            e.prompt.en,
            JSON.stringify({ value: e.answer }),
          ],
        );
      }
    }
  });
  console.log("Review recorded for", id);
} else if (action === "revoke" && id) {
  await transaction(async (db) => {
    await db.run("DELETE FROM curriculum_reviews WHERE topic_id=?", [id]);
    if (process.env.APP_ENV === "production")
      await db.run("UPDATE curriculum_topics SET published=false WHERE id=?", [
        id,
      ]);
  });
  console.log("Review revoked for", id);
} else
  throw new Error(
    "Usage: npm run curriculum -- list | approve TOPIC REAL_REVIEWER VERIFIED_OUTCOME | revoke TOPIC",
  );

await closeDatabase();
