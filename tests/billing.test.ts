import { it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import Stripe from "stripe";
process.env.HABIB_DATABASE_PATH =
  "/tmp/habib-billing-" + randomUUID() + ".sqlite";
process.env.STRIPE_SECRET_KEY = "sk_test_fixture_not_a_credential";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_fixture_not_a_credential";
process.env.STRIPE_FAMILY_PRICE_ID = "price_fixture";
const retrieve = vi.hoisted(() => vi.fn());
vi.mock("stripe", async (importOriginal) => {
  const { default: Original } = await importOriginal<typeof import("stripe")>();
  class TestStripe extends Original {
    constructor(key: string, options: object) {
      super(key, options);
      this.subscriptions.retrieve = retrieve;
    }
  }
  return { default: TestStripe };
});
import { webhook } from "../src/lib/billing";
import { transaction } from "../src/lib/data/db";
const parentId = randomUUID();
beforeEach(async () => {
  await transaction(async (db) => {
    await db.run("DELETE FROM parents");
    await db.run("DELETE FROM stripe_events");
    const now = new Date().toISOString();
    await db.run(
      "INSERT INTO parents(id,email,display_name,created_at) VALUES(?,?,?,?)",
      [parentId, parentId + "@example.invalid", "Test", now],
    );
    await db.run(
      "INSERT INTO subscriptions(parent_id,stripe_customer_id,status,period_start,period_end,voice_limit_ms,updated_at) VALUES(?,?,?,?,?,?,?)",
      [parentId, "cus_fixture", "trial", now, now, 300000, now],
    );
  });
  retrieve.mockReset();
});
function request(type: string, eventId: string, signature = true) {
  const payload = JSON.stringify({
    id: eventId,
    type,
    data: {
      object: { id: "sub_fixture", customer: "cus_fixture", status: "active" },
    },
  });
  const client = new Stripe("sk_test_fixture_not_a_credential");
  const header = client.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  return new NextRequest("http://localhost:3000/api/v1/billing/webhook", {
    method: "POST",
    headers: {
      "stripe-signature": signature ? header : "invalid",
      "Content-Type": "application/json",
    },
    body: payload,
  });
}
it("rejects a forged signature", async () => {
  await expect(
    webhook(request("customer.subscription.updated", "evt_bad", false)),
  ).rejects.toMatchObject({ code: "SIGNATURE_INVALID" });
  expect(retrieve).not.toHaveBeenCalled();
});
it("uses current subscription state and ignores duplicate webhook deliveries", async () => {
  retrieve.mockResolvedValue({
    id: "sub_fixture",
    customer: "cus_fixture",
    status: "past_due",
    cancel_at_period_end: false,
    items: {
      data: [
        {
          price: { id: "price_fixture" },
          current_period_start: 1800000000,
          current_period_end: 1802600000,
        },
      ],
    },
  });
  await webhook(request("customer.subscription.updated", "evt_once"));
  expect(
    (
      await transaction((db) =>
        db.all<{ status: string }>(
          "SELECT status FROM subscriptions WHERE parent_id=?",
          [parentId],
        ),
      )
    )[0].status,
  ).toBe("past_due");
  const second = await webhook(
    request("customer.subscription.updated", "evt_once"),
  );
  expect((await second.json()).duplicate).toBe(true);
  expect(retrieve).toHaveBeenCalledTimes(1);
});
it("removes cancelled entitlement while retaining the current period record", async () => {
  retrieve.mockResolvedValue({
    id: "sub_fixture",
    customer: "cus_fixture",
    status: "canceled",
    cancel_at_period_end: false,
    items: {
      data: [
        {
          price: { id: "price_fixture" },
          current_period_start: 1800000000,
          current_period_end: 1802600000,
        },
      ],
    },
  });
  await webhook(request("customer.subscription.deleted", "evt_deleted"));
  const row = (
    await transaction((db) =>
      db.all<{ status: string; stripe_subscription_id: string | null }>(
        "SELECT status,stripe_subscription_id FROM subscriptions WHERE parent_id=?",
        [parentId],
      ),
    )
  )[0];
  expect(row).toMatchObject({
    status: "canceled",
    stripe_subscription_id: null,
  });
});
