import Stripe from "stripe";
import { NextRequest } from "next/server";
import { bounded, json, AppError } from "./http";
import { transaction } from "./data/db";
import type { Parent } from "./auth";
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new AppError(
      "BILLING_UNAVAILABLE",
      "Billing is not configured yet.",
      503,
    );
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    timeout: 15000,
    maxNetworkRetries: 1,
  });
}
export async function billing(user: Parent, action: "checkout" | "portal") {
  const client = stripe();
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url)
    throw new AppError(
      "BILLING_UNAVAILABLE",
      "Configure the application URL before billing.",
      503,
    );
  const sub = await transaction((db) =>
    db.all<{
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      status: string;
      period_start: string;
    }>(
      "SELECT stripe_customer_id,stripe_subscription_id,status,period_start FROM subscriptions WHERE parent_id=?",
      [user.id],
    ),
  );
  let customerId = sub[0]?.stripe_customer_id;
  if (!customerId) {
    const customer = await client.customers.create(
      { email: user.email, metadata: { parentId: user.id } },
      { idempotencyKey: `parent:${user.id}` },
    );
    customerId = customer.id;
    await transaction((db) =>
      db.run(
        "UPDATE subscriptions SET stripe_customer_id=? WHERE parent_id=?",
        [customerId!, user.id],
      ),
    );
  }
  if (action === "portal") {
    const portal = await client.billingPortal.sessions.create({
      customer: customerId,
      return_url: url + "/settings",
    });
    return json({ url: portal.url });
  }
  if (
    sub[0]?.stripe_subscription_id &&
    ["active", "past_due"].includes(sub[0].status)
  )
    throw new AppError(
      "SUBSCRIPTION_EXISTS",
      "Manage your existing subscription in the billing portal.",
      409,
    );
  const price = process.env.STRIPE_FAMILY_PRICE_ID;
  if (!price)
    throw new AppError(
      "BILLING_UNAVAILABLE",
      "Configure the family price in Stripe.",
      503,
    );
  const checkout = await client.checkout.sessions.create(
    {
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      subscription_data: { metadata: { parentId: user.id } },
      success_url: url + "/settings?checkout=success",
      cancel_url: url + "/pricing",
    },
    {
      idempotencyKey: `checkout:${user.id}:${sub[0]?.period_start}:${sub[0]?.status}`,
    },
  );
  return json({ url: checkout.url });
}
export async function webhook(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret)
    throw new AppError(
      "BILLING_UNAVAILABLE",
      "Webhook configuration is missing.",
      503,
    );
  const signature = req.headers.get("stripe-signature");
  if (!signature)
    throw new AppError("SIGNATURE_INVALID", "Missing webhook signature.");
  const client = stripe();
  let event: Stripe.Event;
  try {
    event = client.webhooks.constructEvent(
      Buffer.from(await bounded(req, 256000)),
      signature,
      secret,
    );
  } catch {
    throw new AppError("SIGNATURE_INVALID", "Invalid webhook signature.");
  }
  const existing = await transaction((db) =>
    db.all("SELECT event_id FROM stripe_events WHERE event_id=?", [event.id]),
  );
  if (existing.length) return json({ received: true, duplicate: true });
  let subscriptionId: string | undefined;
  if (event.type.startsWith("customer.subscription."))
    subscriptionId = (event.data.object as Stripe.Subscription).id;
  if (event.type === "checkout.session.completed")
    subscriptionId = (event.data.object as Stripe.Checkout.Session)
      .subscription as string;
  if (
    event.type === "invoice.paid" ||
    event.type === "invoice.payment_failed"
  ) {
    const invoice = event.data.object as Stripe.Invoice;
    subscriptionId = invoice.parent?.subscription_details
      ?.subscription as string;
  }
  // Retrieve the current state; out-of-order deliveries cannot overwrite it with stale event payloads.
  const subscription = subscriptionId
    ? await client.subscriptions.retrieve(subscriptionId)
    : null;
  await transaction(async (db) => {
    if (
      (
        await db.all("SELECT event_id FROM stripe_events WHERE event_id=?", [
          event.id,
        ])
      ).length
    )
      return;
    if (subscription) {
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      const rows = await db.all<{ parent_id: string }>(
        "SELECT parent_id FROM subscriptions WHERE stripe_customer_id=?",
        [customerId],
      );
      const parentId = rows[0]?.parent_id;
      if (parentId) {
        const item = subscription.items.data[0];
        if (!item || item.price.id !== process.env.STRIPE_FAMILY_PRICE_ID)
          throw new AppError(
            "PRICE_MISMATCH",
            "Unexpected subscription price.",
            400,
          );
        const status =
          subscription.status === "trialing" ? "trial" : subscription.status;
        const start = new Date(item.current_period_start * 1000).toISOString(),
          end = new Date(item.current_period_end * 1000).toISOString();
        await db.run(
          "UPDATE subscriptions SET stripe_subscription_id=?,status=?,period_start=?,period_end=?,voice_limit_ms=?,cancel_at_period_end=?,updated_at=? WHERE parent_id=?",
          [
            subscription.status === "canceled" ? null : subscription.id,
            status,
            start,
            end,
            Number(process.env.HABIB_MONTHLY_VOICE_MINUTES || 120) * 60000,
            subscription.cancel_at_period_end ? 1 : 0,
            new Date().toISOString(),
            parentId,
          ],
        );
      }
    }
    await db.run(
      "INSERT INTO stripe_events(event_id,event_type,processed_at) VALUES(?,?,?)",
      [event.id, event.type, new Date().toISOString()],
    );
  });
  return json({ received: true });
}
