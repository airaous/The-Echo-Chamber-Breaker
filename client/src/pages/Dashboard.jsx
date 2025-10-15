import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/api.js';
import MovieCard from '../components/MovieCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await apiClient.get('/api/recommendations');
        setRecommendations(data.recommendations || []);
        setFavoriteGenres(data.favoriteGenres || []);
      } catch (err) {
        const message = err.response?.data?.message;
        if (err.response?.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (err.response?.status === 400 && message) {
          setError(message);
        } else {
          setError(message || 'Failed to fetch recommendations');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Fetching recommendations…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Your Recommendations</h1>
            <p className="text-sm text-slate-400">
              We detected your comfort-zone genres:{' '}
              {favoriteGenres.length > 0 ? (
                <span className="font-semibold text-amber-400">{favoriteGenres.join(', ')}</span>
              ) : (
                'not enough data yet'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-amber-400 hover:text-amber-300"
          >
            Sign out
          </button>
        </header>
        {error ? <p className="rounded bg-red-500/20 p-3 text-sm text-red-300">{error}</p> : null}
        {recommendations.length === 0 && !error ? (
          <p className="text-sm text-slate-300">
            We could not find suitable recommendations outside your favorite genres yet. Try rating more
            movies from the onboarding list.
          </p>
        ) : null}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recommendations.map((movie) => (
            <MovieCard key={movie.id} movie={movie}>
              <button
                type="button"
                className="w-full rounded-lg border border-amber-500 px-3 py-2 text-sm font-semibold text-amber-400"
              >
                Add to watchlist
              </button>
            </MovieCard>
          ))}
        </div>
      </div>
    </div>
  );
}
