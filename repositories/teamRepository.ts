import { subscribeTeamMembers, saveTeamMemberToFirestore, fetchTeamMembersDirectly } from '../services/firebase';
import { User } from '../types';

export const teamRepository = {
  subscribe: (onUpdate: (members: User[]) => void) => subscribeTeamMembers(onUpdate),
  save: (member: User) => saveTeamMemberToFirestore(member),
  fetchDirectly: () => fetchTeamMembersDirectly(),
};
