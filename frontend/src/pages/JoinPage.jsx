import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';

const JoinPage = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('Joining room...');

  useEffect(() => {
    api
      .get(`/rooms/invite/${inviteCode}`)
      .then((response) => navigate(`/rooms/${response.data.room.id}`))
      .catch(() => setError('Please login to join this room from invite link.'));
  }, [inviteCode, navigate]);

  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl bg-white p-8 text-center shadow">
      <p className="text-slate-700">{error}</p>
      <Link className="mt-4 inline-block rounded bg-orange-500 px-4 py-2 text-white" to="/login">
        Go to Login
      </Link>
    </div>
  );
};

export default JoinPage;
