const isScrumMaster = (members, userId) =>
  members.some((member) => member.user.toString() === userId.toString() && member.role === 'scrum_master');

const isMember = (members, userId) =>
  members.some((member) => member.user.toString() === userId.toString());

module.exports = { isScrumMaster, isMember };
