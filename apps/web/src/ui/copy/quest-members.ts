// The text of multi-user quests: a quest's Members disclosure, the Quests page's
// Pending tab, the page an invitation's acceptance link opens, and the
// invitation email.

import type { QuestSharing } from "@/quests/membership.ts";
import {
  INVITATION_LINK_LIFETIME_DAYS,
  INVITATIONS_PER_HOUR,
} from "@/quests/membership.ts";
import { EMAIL_SENDER_COPY, SITE_COPY } from "@/ui/copy/site.ts";

export const QUEST_MEMBERS_COPY = {
  heading: "Members",
  listLabel: "People in this quest",
  owner: "Owner",
  member: "Member",
  invited: "Invited, not accepted yet",
  you: (name: string): string => `${name} (you)`,
  intro:
    "Everyone here shares this quest's conversation, Tasks, Ideas, Progress and Quick Notes. Members can do everything the owner can, except remove the owner.",
  emailLabel: "Invite by email",
  emailHint:
    "They'll get an email with a link to join. People without an account get one when you invite them.",
  invite: "Invite",
  inviting: "Inviting…",
  inQuest: (email: string): string => `${email} is already in this quest.`,
  limited: `You can send up to ${INVITATIONS_PER_HOUR} invitations an hour, and you've reached that. Try again later.`,
  notFound: "This quest is no longer available to you.",
  remove: "Remove",
  removeLabel: (name: string): string => `Remove ${name} from this quest`,
  removeConfirm: (name: string): string =>
    `${name} loses access to this quest's conversation, Tasks and everything else in it. What they wrote stays. Anyone in the quest can invite them again.`,
  removeCancel: "Keep member",
  withdraw: "Withdraw",
  withdrawLabel: (name: string): string => `Withdraw ${name}'s invitation`,
  leave: "Leave quest",
  leaveConfirm:
    "Leave this quest? You'll lose access to it. What you wrote stays. Someone in the quest can invite you again.",
  leaveCancel: "Stay in quest",
  leaveConfirmButton: "Leave quest",
  failed: "That change couldn't be made. Refresh and try again.",
  dailies: "Dailies is just for you, so it has no members.",
  left: (name: string): string => `You left the quest "${name}".`,
} as const;

// The marker a multi-user quest carries wherever quests are listed or
// chosen; a personal quest has none.
export const QUEST_SHARING_COPY = {
  mark: (sharing: QuestSharing): string | undefined => {
    switch (sharing.kind) {
      case "personal":
        return undefined;
      case "shared":
        return "Shared";
      case "joined":
        return `Shared by ${sharing.owner}`;
      default:
        return sharing satisfies never;
    }
  },
  option: (name: string, sharing: QuestSharing): string => {
    switch (sharing.kind) {
      case "personal":
        return name;
      case "shared":
        return `${name} (shared)`;
      case "joined":
        return `${name} (shared by ${sharing.owner})`;
      default:
        return sharing satisfies never;
    }
  },
} as const;

export const PENDING_COPY = {
  label: "Pending",
  tabLabel: (count: number): string => {
    if (count === 0) {
      return "Pending";
    }
    if (count === 1) {
      return "Pending, 1 invitation";
    }
    return `Pending, ${count} invitations`;
  },
  none: "No pending invitations.",
  invitedBy: (name: string, time: string): string =>
    `${name} invited you ${time}`,
  invitedAt: (time: string): string => `Invited ${time}`,
  accept: "Accept",
  acceptLabel: (name: string): string => `Accept the invitation to ${name}`,
  decline: "Decline",
  declineLabel: (name: string): string => `Decline the invitation to ${name}`,
  accepted: (name: string, status: string): string =>
    `You joined ${name}. It's now in ${status}.`,
  open: "Open the quest",
  declined: (name: string): string => `Declined the invitation to ${name}.`,
  failed:
    "That invitation is no longer available. It may have been withdrawn or answered elsewhere.",
} as const;

export const INVITATION_LINK_COPY = {
  intro: (invitedBy: string | undefined, questName: string): string => {
    if (invitedBy === undefined) {
      return `You're invited to join the quest "${questName}". Continue to join it in this browser.`;
    }
    return `${invitedBy} invited you to join the quest "${questName}". Continue to join it in this browser.`;
  },
  needsName: "Enter your name to finish creating your account.",
  otherAccount: (email: string): string =>
    `This invitation is for ${email}. Continuing signs this browser in to that account.`,
} as const;

export const QUEST_INVITATION_EMAIL_COPY = {
  subject: (questName: string): string =>
    `You're invited to join the quest "${questName}" on ${SITE_COPY.name}`,
  greeting: "Greetings, traveller.",
  intro: ({
    invitedBy,
    owner,
    questName,
  }: {
    readonly invitedBy: string;
    readonly owner: string | undefined;
    readonly questName: string;
  }): string => {
    let quest = `the quest "${questName}"`;
    if (owner !== undefined) {
      quest = `${owner}'s quest "${questName}"`;
    }
    return `${invitedBy} invited you to join ${quest} on ${SITE_COPY.name}. Everyone in the quest shares its conversation, Tasks, Ideas, Progress and Quick Notes. Open the link to join:`;
  },
  linkText: "Join the quest",
  expiry: `The link works once, for ${INVITATION_LINK_LIFETIME_DAYS} days, on any device. It signs you in and joins only this quest.`,
  pending: `Until you join, the quest waits in the Pending tab of your Quests page whenever you log in to ${SITE_COPY.name}.`,
  notExpected:
    "If you weren't expecting this, you can set this email aside. An account was set aside for this address so you could join, and it stays unused unless you do.",
  notExpectedMember:
    "If you weren't expecting this, you can set this email aside. You stay out of the quest unless you join.",
  signOff: "Safe travels,",
  signature: EMAIL_SENDER_COPY.name,
} as const;
