import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
it("PostgreSQL migration isolates families and blocks direct child writes", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "CREATE SCHEMA auth; CREATE ROLE authenticated; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE SQL STABLE AS $$ SELECT NULLIF(current_setting('habib.test_user',true),'')::uuid $$; GRANT USAGE ON SCHEMA auth TO authenticated;",
    );
    await db.exec(
      readFileSync("supabase/migrations/001_family_learning.sql", "utf8"),
    );
    await db.exec(
      "GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated; INSERT INTO parents(id,email,display_name,created_at) VALUES('11111111-1111-4111-8111-111111111111','a@test.invalid','A','today'),('22222222-2222-4222-8222-222222222222','b@test.invalid','B','today'); INSERT INTO children(id,parent_id,nickname,school_year,language,created_at) VALUES('child-a','11111111-1111-4111-8111-111111111111','A',5,'mt','today'),('child-b','22222222-2222-4222-8222-222222222222','B',4,'mt','today'); SET ROLE authenticated; SELECT set_config('habib.test_user','11111111-1111-4111-8111-111111111111',false);",
    );
    expect(
      (await db.query<{ nickname: string }>("SELECT nickname FROM children"))
        .rows,
    ).toEqual([{ nickname: "A" }]);
    expect((await db.query("SELECT * FROM auth_sessions")).rows).toHaveLength(
      0,
    );
    await expect(
      db.exec(
        "INSERT INTO children(id,parent_id,nickname,school_year,language,created_at) VALUES('bad','11111111-1111-4111-8111-111111111111','Bad',5,'mt','today')",
      ),
    ).rejects.toThrow(/row-level security/);
  } finally {
    await db.close();
  }
}, 20000);
