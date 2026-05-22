import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('Sprint Planning');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const response = await api.get('/rooms');
        if (mounted) {
          setRooms(response.data.rooms);
        }
      } catch {
        if (mounted) {
          setError('Unable to load rooms');
        }
      }
    };

    initialize();
    return () => {
      mounted = false;
    };
  }, []);

  const createRoom = async (event) => {
    event.preventDefault();
    try {
      const response = await api.post('/rooms', { name: roomName });
      navigate(`/rooms/${response.data.room.id}`);
    } catch {
      setError('Room creation failed');
    }
  };

  const joinByCode = async (event) => {
    event.preventDefault();
    try {
      const response = await api.get(`/rooms/invite/${inviteCode}`);
      navigate(`/rooms/${response.data.room.id}`);
    } catch {
      setError('Invite code invalid');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between rounded-2xl bg-white p-5 shadow">
        <h1 className="text-2xl font-bold text-orange-600">Planning Poker Dashboard</h1>
        <button className="rounded-lg border border-orange-200 px-4 py-2 text-sm" onClick={logout} type="button">
          Logout
        </button>
      </header>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <form className="rounded-2xl bg-white p-5 shadow" onSubmit={createRoom}>
          <h2 className="text-lg font-semibold text-slate-800">Create Room (Scrum Master)</h2>
          <input
            className="mt-3 w-full rounded-lg border border-orange-200 px-3 py-2"
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
            required
          />
          <button className="mt-4 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white" type="submit">
            Create Room
          </button>
        </form>

        <form className="rounded-2xl bg-white p-5 shadow" onSubmit={joinByCode}>
          <h2 className="text-lg font-semibold text-slate-800">Join with Invite Code</h2>
          <input
            className="mt-3 w-full rounded-lg border border-orange-200 px-3 py-2 uppercase"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            placeholder="ABC123"
            required
          />
          <button className="mt-4 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white" type="submit">
            Join Room
          </button>
        </form>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow">
        <h2 className="text-lg font-semibold text-slate-800">Your Rooms</h2>
        <ul className="mt-3 space-y-2">
          {rooms.map((room) => (
            <li className="flex items-center justify-between rounded-lg border border-orange-100 px-3 py-2" key={room.id}>
              <div>
                <p className="font-medium">{room.name}</p>
                <p className="text-xs text-slate-500">Invite: {room.inviteCode}</p>
              </div>
              <Link className="rounded bg-orange-50 px-3 py-1 text-sm text-orange-700" to={`/rooms/${room.id}`}>
                Open
              </Link>
            </li>
          ))}
          {!rooms.length && <li className="text-sm text-slate-500">No rooms yet.</li>}
        </ul>
      </section>
    </div>
  );
};

export default DashboardPage;
