/**
 * Group-related constants
 * 
 * Central location for group configuration values.
 * Change these values to adjust group limits across the entire application.
 */

/**
 * Maximum number of members allowed in a group.
 * When a group reaches this limit:
 * - It won't appear in the "Find a Group" discovery page
 * - The "Invite friends" card will be hidden
 * - New members cannot join via invite link or code
 */
export const MAX_GROUP_MEMBERS = 10;

// Backwards compatibility alias
export const MAX_SQUAD_MEMBERS = MAX_GROUP_MEMBERS;






