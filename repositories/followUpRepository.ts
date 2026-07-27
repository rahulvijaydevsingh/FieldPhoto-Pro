import { subscribeFollowUps, saveFollowUpToFirestore } from '../services/firebase';
import { FollowUp } from '../types';

export const followUpRepository = {
  subscribe: (onUpdate: (items: FollowUp[]) => void) => subscribeFollowUps(onUpdate),
  save: (followUp: FollowUp) => saveFollowUpToFirestore(followUp),
};
