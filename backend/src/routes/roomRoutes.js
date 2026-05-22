const express = require('express');
const auth = require('../middleware/auth');
const {
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
} = require('../controllers/roomController');

const router = express.Router();

router.use(auth);

router.post('/', createRoom);
router.get('/', listRooms);
router.get('/invite/:inviteCode', getRoomByInvite);
router.get('/:roomId', getRoom);
router.delete('/:roomId', deleteRoom);
router.patch('/:roomId/settings', updateSettings);
router.post('/:roomId/stories', addStory);
router.patch('/:roomId/stories/:storyId', updateStory);
router.delete('/:roomId/stories/:storyId', deleteStory);
router.patch('/:roomId/stories/:storyId/voting/start', startVoting);
router.patch('/:roomId/stories/:storyId/voting/reveal', revealVotes);
router.post('/:roomId/stories/:storyId/vote', vote);

module.exports = router;
