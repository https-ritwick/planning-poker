const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const storySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    revealed: { type: Boolean, default: false },
    votes: { type: [voteSchema], default: [] },
  },
  { timestamps: true }
);

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    inviteCode: { type: String, required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['scrum_master', 'player'], required: true },
      },
    ],
    settings: {
      votingScale: { type: [String], default: ['1', '2', '3', '5', '8', '13', '?'] },
      autoReveal: { type: Boolean, default: false },
      allowObservers: { type: Boolean, default: true },
      themeColor: { type: String, default: 'orange' },
    },
    stories: { type: [storySchema], default: [] },
    activeStoryId: { type: mongoose.Schema.Types.ObjectId, default: null },
    isVotingActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
