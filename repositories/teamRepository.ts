import { subscribeTeamMembers, saveTeamMemberToFirestore, fetchTeamMembersDirectly, deleteTeamMemberFromFirestore } from '../services/firebase';
import { User } from '../types';

export const teamRepository = {
  subscribe: (onUpdate: (members: User[]) => void) => subscribeTeamMembers(onUpdate),
  save: (member: User) => saveTeamMemberToFirestore(member),
  fetchDirectly: () => fetchTeamMembersDirectly(),
  delete: (memberId: string) => deleteTeamMemberFromFirestore(memberId),
};
