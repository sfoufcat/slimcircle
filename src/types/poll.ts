/**
 * Poll Types for SlimCircle Chat
 * 
 * These types define the data model for polls in the chat system.
 * Polls can be created by users in group chats and other channels.
 */

export interface ChatPollOption {
  id: string;
  text: string;
}

export interface ChatPollSettings {
  activeTill: string; // ISO datetime string
  anonymous: boolean;
  multipleAnswers: boolean;
  participantsCanAddOptions: boolean;
}

export interface ChatPollVote {
  optionId: string;
  userId: string;
  userName?: string;
  userImage?: string;
  createdAt: string;
}

export interface ChatPollState {
  id: string;
  channelId: string;
  question: string;
  options: ChatPollOption[];
  settings: ChatPollSettings;
  createdByUserId: string;
  createdByUserName?: string;
  createdByUserImage?: string;
  createdAt: string;
  closedAt?: string;
  // Aggregated votes
  votes: ChatPollVote[];
  votesByOption: Record<string, number>; // optionId -> count
  totalVotes: number;
  // User's own votes
  userVotes?: string[]; // optionIds the current user voted for
}

// Form state for creating a poll
export interface PollFormData {
  question: string;
  options: { id: string; text: string }[];
  settings: {
    activeTill: Date;
    anonymous: boolean;
    multipleAnswers: boolean;
    participantsCanAddOptions: boolean;
  };
}

// Message extra data containing poll reference
// Using sc_ prefix to avoid conflict with Stream Chat's native polls feature
export interface PollMessageExtraData {
  sc_poll_id: string;
  sc_poll_kind: 'slimcircle_poll';
  // Embedded poll data for real-time display (denormalized)
  sc_poll_data?: ChatPollState;
}

// Type guard to check if a message has poll data
export function isPollMessage(message: Record<string, unknown>): boolean {
  const extraData = message?.extraData as Record<string, unknown> | undefined;
  return !!(
    message?.sc_poll_id ||
    extraData?.sc_poll_id ||
    message?.sc_poll_data
  );
}

// Get poll ID from message
export function getPollIdFromMessage(message: Record<string, unknown>): string | null {
  const extraData = message?.extraData as Record<string, unknown> | undefined;
  return (message?.sc_poll_id as string) || (extraData?.sc_poll_id as string) || null;
}

