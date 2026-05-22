import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthPage = ({ mode }) => {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      if (isRegister) {
        await register(form.name, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Authentication failed');
    }
  };

  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-2xl border border-orange-100 bg-white p-8 shadow-lg">
      <h1 className="text-2xl font-bold text-orange-600">
        {isRegister ? 'Create your account' : 'Sign in'}
      </h1>
      <p className="mt-2 text-sm text-slate-600">Planning Poker with Scrum Master controls and invite links.</p>
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form className="mt-6 space-y-4" onSubmit={submit}>
        {isRegister && (
          <input
            className="w-full rounded-lg border border-orange-200 px-3 py-2"
            placeholder="Name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        )}
        <input
          className="w-full rounded-lg border border-orange-200 px-3 py-2"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          required
        />
        <input
          className="w-full rounded-lg border border-orange-200 px-3 py-2"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          required
        />
        <button className="w-full rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600" type="submit">
          {isRegister ? 'Register' : 'Login'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        {isRegister ? 'Already have an account?' : 'Need an account?'}{' '}
        <Link className="font-medium text-orange-600" to={isRegister ? '/login' : '/register'}>
          {isRegister ? 'Login' : 'Register'}
        </Link>
      </p>
    </div>
  );
};

export default AuthPage;
