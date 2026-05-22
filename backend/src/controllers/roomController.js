const crypto = require('crypto');
const Room = require('../models/Room');
const { isScrumMaster, isMember } = require('../utils/roles');

const formatRoom = (room, userId) => {
  const member = room.members.find((m) => m.user.toString() === userId.toString());
  const userRole = member?.role || 'player';

  return {
    id: room._id,
    name: room.name,
    inviteCode: room.inviteCode,
    settings: room.settings,
    createdBy: room.createdBy,
    members: room.members,
    stories: room.stories,
    activeStoryId: room.activeStoryId,
    isVotingActive: room.isVotingActive,
    userRole,
    theme: 'orange',
  };
};

const ensureMember = async (room, userId) => {
  const alreadyMember = isMember(room.members, userId);
  if (!alreadyMember) {
    room.members.push({ user: userId, role: 'player' });
    await room.save();
  }
};

const createRoom = async (req, res) => {
  const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  const room = await Room.create({
    name: req.body.name || 'Planning Room',
    inviteCode,
    createdBy: req.user._id,
    members: [{ user: req.user._id, role: 'scrum_master' }],
    settings: {
      votingScale: req.body.settings?.votingScale?.length
        ? req.body.settings.votingScale
        : ['1', '2', '3', '5', '8', '13', '?'],
      autoReveal: Boolean(req.body.settings?.autoReveal),
      allowObservers: req.body.settings?.allowObservers ?? true,
      themeColor: 'orange',
    },
  });

  return res.status(201).json({ room: formatRoom(room, req.user._id) });
};

const listRooms = async (req, res) => {
  const rooms = await Room.find({ 'members.user': req.user._id }).sort({ updatedAt: -1 });
  return res.json({ rooms: rooms.map((room) => formatRoom(room, req.user._id)) });
};

const getRoomByInvite = async (req, res) => {
  const room = await Room.findOne({ inviteCode: req.params.inviteCode.toUpperCase() });
  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }

  await ensureMember(room, req.user._id);
  return res.json({ room: formatRoom(room, req.user._id) });
};

const getRoom = async (req, res) => {
  const room = await Room.findById(req.params.roomId);
  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }

  const roomMember = isMember(room.members, req.user._id);
  if (!roomMember) {
    return res.status(403).json({ message: 'You are not part of this room' });
  }

  return res.json({ room: formatRoom(room, req.user._id) });
};

const deleteRoom = async (req, res) => {
  const room = await Room.findById(req.params.roomId);
  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }

  if (!isScrumMaster(room.members, req.user._id)) {
    return res.status(403).json({ message: 'Only Scrum Master can delete the room' });
  }

  await Room.deleteOne({ _id: room._id });
  return res.json({ message: 'Room deleted' });
};

const updateSettings = async (req, res) => {
  const room = await Room.findById(req.params.roomId);
  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }

  if (!isScrumMaster(room.members, req.user._id)) {
    return res.status(403).json({ message: 'Only Scrum Master can update settings' });
  }

  const { votingScale, autoReveal, allowObservers } = req.body;
  if (Array.isArray(votingScale) && votingScale.length) {
    room.settings.votingScale = votingScale.map(String);
  }
  if (typeof autoReveal === 'boolean') {
    room.settings.autoReveal = autoReveal;
  }
  if (typeof allowObservers === 'boolean') {
    room.settings.allowObservers = allowObservers;
  }

  await room.save();
  return res.json({ room: formatRoom(room, req.user._id) });
};

const addStory = async (req, res) => {
  const room = await Room.findById(req.params.roomId);
  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }

  if (!isScrumMaster(room.members, req.user._id)) {
    return res.status(403).json({ message: 'Only Scrum Master can add stories' });
  }

  if (!req.body.title) {
    return res.status(400).json({ message: 'Story title is required' });
  }

  room.stories.push({ title: req.body.title, description: req.body.description || '' });
  await room.save();
  return res.status(201).json({ room: formatRoom(room, req.user._id) });
};

const updateStory = async (req, res) => {
  const room = await Room.findById(req.params.roomId);
  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }

  if (!isScrumMaster(room.members, req.user._id)) {
    return res.status(403).json({ message: 'Only Scrum Master can update stories' });
  }

  const story = room.stories.id(req.params.storyId);
  if (!story) {
    return res.status(404).json({ message: 'Story not found' });
  }

  story.title = req.body.title || story.title;
  story.description = req.body.description ?? story.description;
  await room.save();
  return res.json({ room: formatRoom(room, req.user._id) });
};

const deleteStory = async (req, res) => {
  const room = await Room.findById(req.params.roomId);
  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }

  if (!isScrumMaster(room.members, req.user._id)) {
    return res.status(403).json({ message: 'Only Scrum Master can delete stories' });
  }

  const story = room.stories.id(req.params.storyId);
  if (!story) {
    return res.status(404).json({ message: 'Story not found' });
  }

  story.deleteOne();
  if (room.activeStoryId?.toString() === req.params.storyId) {
    room.activeStoryId = null;
    room.isVotingActive = false;
  }
  await room.save();
  return res.json({ room: formatRoom(room, req.user._id) });
};

const startVoting = async (req, res) => {
  const room = await Room.findById(req.params.roomId);
  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }

  if (!isScrumMaster(room.members, req.user._id)) {
    return res.status(403).json({ message: 'Only Scrum Master can start voting' });
  }

  const story = room.stories.id(req.params.storyId);
  if (!story) {
    return res.status(404).json({ message: 'Story not found' });
  }

  story.votes = [];
  story.revealed = false;
  room.activeStoryId = story._id;
  room.isVotingActive = true;
  await room.save();

  return res.json({ room: formatRoom(room, req.user._id) });
};

const revealVotes = async (req, res) => {
  const room = await Room.findById(req.params.roomId);
  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }

  if (!isScrumMaster(room.members, req.user._id)) {
    return res.status(403).json({ message: 'Only Scrum Master can reveal votes' });
  }

  const story = room.stories.id(req.params.storyId);
  if (!story) {
    return res.status(404).json({ message: 'Story not found' });
  }

  story.revealed = true;
  room.isVotingActive = false;
  await room.save();

  return res.json({ room: formatRoom(room, req.user._id) });
};

const vote = async (req, res) => {
  const room = await Room.findById(req.params.roomId);
  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }

  const member = room.members.find((m) => m.user.toString() === req.user._id.toString());
  if (!member) {
    return res.status(403).json({ message: 'You are not part of this room' });
  }

  if (member.role !== 'player') {
    return res.status(403).json({ message: 'Only players can vote' });
  }

  const story = room.stories.id(req.params.storyId);
  if (!story) {
    return res.status(404).json({ message: 'Story not found' });
  }

  if (!room.isVotingActive || room.activeStoryId?.toString() !== story._id.toString()) {
    return res.status(400).json({ message: 'Voting is not active for this story' });
  }

  const value = String(req.body.value || '');
  if (!room.settings.votingScale.includes(value)) {
    return res.status(400).json({ message: 'Invalid vote value' });
  }

  const existingVote = story.votes.find((entry) => entry.user.toString() === req.user._id.toString());
  if (existingVote) {
    existingVote.value = value;
  } else {
    story.votes.push({ user: req.user._id, value });
  }

  if (room.settings.autoReveal && story.votes.length >= room.members.filter((m) => m.role === 'player').length) {
    story.revealed = true;
    room.isVotingActive = false;
  }

  await room.save();
  return res.json({ room: formatRoom(room, req.user._id) });
};

module.exports = {
  createRoom,
  listRooms,
  getRoomByInvite,
  getRoom,
  deleteRoom,
  updateSettings,
  addStory,
  updateStory,
  deleteStory,
  startVoting,
  revealVotes,
  vote,
};
