/**
 * Shared TypeScript models. These mirror the JSON shapes produced by the
 * FastAPI backend (see backend/app/room.py -> Room.snapshot()).
 */

export type Role =
  | 'admin'
  | 'developer'
  | 'tester'
  | 'business_analyst'
  | 'observer';

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type StoryStatus = 'pending' | 'active' | 'estimated';

export const CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?', 'coffee'];
export const NUMERIC_CARDS = new Set(['0', '1', '2', '3', '5', '8', '13', '21', '34']);

export interface UserPublic {
  id: string;
  name: string;
  role: Role;
  is_active: boolean;
  is_admin: boolean;
  can_vote: boolean;
  has_voted: boolean;
  joined_at: number;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  priority: Priority;
  jira_id: string | null;
  status: StoryStatus;
  final_estimate: string | null;
  created_at: number;
}

export interface Stats {
  distribution: Record<string, number>;
  average: number | null;
  median: number | null;
  lowest: string | null;
  highest: string | null;
  consensus: boolean;
  suggested: string | null;
  numeric_count: number;
  special_count: number;
  total_votes: number;
}

export interface RoundResult {
  story_id: string;
  story_title: string;
  votes: Record<string, string>;
  vote_names: Record<string, string>;
  average: number | null;
  median: number | null;
  lowest: string | null;
  highest: string | null;
  consensus: boolean;
  suggested: string | null;
  final_estimate: string | null;
  timestamp: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  team: string | null;
  admin_id: string;
  created_at: number;
}

export interface Snapshot {
  room: RoomInfo;
  users: UserPublic[];
  stories: Story[];
  current_story_id: string | null;
  revealed: boolean;
  votes: Record<string, string>;
  vote_names: Record<string, string>;
  stats: Stats | null;
  timer_remaining: number | null;
  timer_auto_reveal: boolean;
  history: RoundResult[];
  estimated_count: number;
  pending_count: number;
}

/** Local identity persisted in the browser so a refresh keeps the session. */
export interface Identity {
  roomId: string;
  userId: string;
  role: Role;
  name: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Scrum Master',
  developer: 'Developer',
  tester: 'Tester',
  business_analyst: 'Business Analyst',
  observer: 'Observer',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};
