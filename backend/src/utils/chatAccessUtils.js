/**
 * Shared access rules for AI and human agent chat.
 */
import { mongo } from "../db/mongo.js";
import { userIdQuery, resolveUserId } from "./userQuery.js";

const FREE_WEEK_DAYS = 7;

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isLiveSubscription(sub) {
  if (!sub) return false;
  if (sub.status === "trial") {
    const end = parseDate(sub.trial_end);
    return !end || end > new Date();
  }
  if (sub.status === "active") {
    const end = parseDate(sub.subscription_end);
    return !end || end > new Date();
  }
  return false;
}

export async function findLiveSubscription(userId) {
  return mongo.subscriptions().findOne(
    { ...userIdQuery(userId), status: { $in: ["active", "trial"] } },
    { sort: { updated_at: -1 } }
  );
}

export async function checkFreeWeekAccess(userId) {
  const session = await mongo.chat_sessions().findOne(
    {
      ...userIdQuery(userId),
      $or: [{ session_type: "ai" }, { session_type: { $exists: false } }],
    },
    { sort: { started_at: -1 } }
  );

  if (!session) {
    return { hasAccess: true, isNew: true, daysRemaining: FREE_WEEK_DAYS };
  }

  if (!session.free_access_ends) {
    return { hasAccess: false, daysRemaining: 0, sessionId: session._id };
  }

  const daysRemaining = Math.ceil(
    (new Date(session.free_access_ends) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return {
    hasAccess: daysRemaining > 0,
    daysRemaining: Math.max(0, daysRemaining),
    sessionId: session._id,
    freeAccessEnds: session.free_access_ends,
  };
}

export async function hasHumanChatAccess(userId, subscriptionSnapshot) {
  const sub =
    subscriptionSnapshot && isLiveSubscription(subscriptionSnapshot)
      ? subscriptionSnapshot
      : await findLiveSubscription(userId);

  if (isLiveSubscription(sub)) {
    const daysRemaining =
      sub.status === "trial" && sub.trial_end
        ? Math.max(
            0,
            Math.ceil((new Date(sub.trial_end) - new Date()) / (1000 * 60 * 60 * 24))
          )
        : null;

    return {
      hasAccess: true,
      accessSource: sub.status === "trial" ? "trial" : "subscription",
      daysRemaining,
    };
  }

  const freeWeek = await checkFreeWeekAccess(userId);
  if (freeWeek.hasAccess) {
    return {
      hasAccess: true,
      accessSource: "free_week",
      daysRemaining: freeWeek.daysRemaining,
    };
  }

  return {
    hasAccess: false,
    message:
      "Your 1-week free access has ended. Start a subscription or trial to keep chatting with an agent.",
  };
}

export { resolveUserId };
