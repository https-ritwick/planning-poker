import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';

const RoomPage = () => {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [settingsScale, setSettingsScale] = useState('1,2,3,5,8,13,?');
  const [error, setError] = useState('');

  const isScrumMaster = room?.userRole === 'scrum_master';
  const activeStory = useMemo(
    () => room?.stories?.find((story) => story._id === room.activeStoryId) || room?.stories?.[0],
    [room]
  );

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const response = await api.get(`/rooms/${roomId}`);
        if (mounted) {
          setRoom(response.data.room);
          setSettingsScale(response.data.room.settings.votingScale.join(','));
        }
      } catch {
        if (mounted) {
          setError('Unable to load room');
        }
      }
    };

    initialize();
    return () => {
      mounted = false;
    };
  }, [roomId]);

  const addStory = async (event) => {
    event.preventDefault();
    const response = await api.post(`/rooms/${roomId}/stories`, { title, description });
    setRoom(response.data.room);
    setTitle('');
    setDescription('');
  };

  const startVoting = async (storyId) => {
    const response = await api.patch(`/rooms/${roomId}/stories/${storyId}/voting/start`);
    setRoom(response.data.room);
  };

  const revealVotes = async (storyId) => {
    const response = await api.patch(`/rooms/${roomId}/stories/${storyId}/voting/reveal`);
    setRoom(response.data.room);
  };

  const vote = async (value) => {
    if (!activeStory) return;
    const response = await api.post(`/rooms/${roomId}/stories/${activeStory._id}/vote`, { value });
    setRoom(response.data.room);
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    const response = await api.patch(`/rooms/${roomId}/settings`, {
      votingScale: settingsScale
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    });
    setRoom(response.data.room);
  };

  const deleteRoom = async () => {
    await api.delete(`/rooms/${roomId}`);
    window.location.href = '/dashboard';
  };

  if (!room) {
    return <p className="rounded bg-white p-4 shadow">Loading room...</p>;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-white p-5 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-orange-600">{room.name}</h1>
            <p className="text-sm text-slate-500">Invite Link: {`${window.location.origin}/join/${room.inviteCode}`}</p>
          </div>
          <Link className="rounded-lg border border-orange-200 px-4 py-2 text-sm" to="/dashboard">
            Back
          </Link>
        </div>
      </header>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {isScrumMaster && (
        <div className="grid gap-6 md:grid-cols-2">
          <form className="rounded-2xl bg-white p-5 shadow" onSubmit={saveSettings}>
            <h2 className="text-lg font-semibold">Room Settings</h2>
            <label className="mt-3 block text-sm text-slate-600">Voting scale (comma separated)</label>
            <input
              className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2"
              value={settingsScale}
              onChange={(event) => setSettingsScale(event.target.value)}
            />
            <button className="mt-4 rounded bg-orange-500 px-3 py-2 font-semibold text-white" type="submit">
              Save Settings
            </button>
            <button className="mt-4 ml-2 rounded bg-red-500 px-3 py-2 font-semibold text-white" onClick={deleteRoom} type="button">
              Delete Room
            </button>
          </form>

          <form className="rounded-2xl bg-white p-5 shadow" onSubmit={addStory}>
            <h2 className="text-lg font-semibold">Story Management</h2>
            <input
              className="mt-3 w-full rounded-lg border border-orange-200 px-3 py-2"
              placeholder="Story title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
            <textarea
              className="mt-3 w-full rounded-lg border border-orange-200 px-3 py-2"
              placeholder="Story details"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <button className="mt-4 rounded bg-orange-500 px-3 py-2 font-semibold text-white" type="submit">
              Add Story
            </button>
          </form>
        </div>
      )}

      <section className="rounded-2xl bg-white p-5 shadow">
        <h2 className="text-lg font-semibold">Stories</h2>
        <div className="mt-3 space-y-3">
          {room.stories.map((story) => (
            <div className="rounded-lg border border-orange-100 p-3" key={story._id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{story.title}</p>
                  <p className="text-sm text-slate-500">{story.description}</p>
                  <p className="text-xs text-slate-500">
                    Votes: {story.votes.length} {story.revealed ? `(revealed: ${story.votes.map((voteEntry) => voteEntry.value).join(', ')})` : '(hidden)'}
                  </p>
                </div>
                {isScrumMaster && (
                  <div className="space-x-2">
                    <button
                      className="rounded bg-orange-100 px-3 py-1 text-sm text-orange-700"
                      onClick={() => startVoting(story._id)}
                      type="button"
                    >
                      Start Voting
                    </button>
                    <button
                      className="rounded bg-orange-600 px-3 py-1 text-sm text-white"
                      onClick={() => revealVotes(story._id)}
                      type="button"
                    >
                      Reveal
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {!room.stories.length && <p className="text-sm text-slate-500">No stories added yet.</p>}
        </div>
      </section>

      {!isScrumMaster && activeStory && (
        <section className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-lg font-semibold">Vote on: {activeStory.title}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {room.settings.votingScale.map((value) => (
              <button
                className="min-w-12 rounded border border-orange-300 px-3 py-2 font-semibold text-orange-700"
                key={value}
                onClick={() => vote(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default RoomPage;
