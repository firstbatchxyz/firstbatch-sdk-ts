import library from '../algorithm/blueprint/library';

export const presetAlgorithms: Record<keyof typeof library, string> = {
  UNIQUE_JOURNEYS: 'Unique_Journeys'.toUpperCase(),
  CONTENT_CURATION: 'User_Centric_Promoted_Content_Curations'.toUpperCase(),
  AI_AGENTS: 'User_Intent_AI_Agents'.toUpperCase(),
  RECOMMENDATIONS: 'Individually_Crafted_Recommendations'.toUpperCase(),
  NAVIGATION: 'Navigable_UX'.toUpperCase(),
};
