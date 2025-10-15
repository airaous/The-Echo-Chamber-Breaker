import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/api.js';
import MovieCard from '../components/MovieCard.jsx';

const MIN_REQUIRED_RATINGS = 5;

export default function OnboardingProcess() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [ratedMovies, setRatedMovies] = useState(() => new Map());

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await apiClient.get('/api/movies/onboarding');
        setMovies(data.movies || []);
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login');
          return;
        }
        setError(err.response?.data?.message || 'Failed to load onboarding movies');
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [navigate]);

  const ratedCount = useMemo(() => ratedMovies.size, [ratedMovies]);

  const handleRate = async (movieId, rating) => {
    if (pending) {
      return;
    }

    setPending(true);
    try {
      await apiClient.post('/api/ratings', { movieId, rating });
      setRatedMovies((prev) => new Map(prev).set(movieId, rating));
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }
      setError(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setPending(false);
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading movies…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Let us learn your taste</h1>
          <p className="text-sm text-slate-400">
            Rate at least {MIN_REQUIRED_RATINGS} movies so we can recommend genres you rarely watch.
          </p>
        </header>
        {error ? <p className="rounded bg-red-500/20 p-3 text-sm text-red-300">{error}</p> : null}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie}>
              {[1, 2, 3, 4, 5].map((value) => {
                const isSelected = ratedMovies.get(movie.id) === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleRate(movie.id, value)}
                    disabled={pending && !isSelected}
                    className={`flex-1 rounded-lg px-2 py-1 text-sm font-semibold transition ${
                      isSelected
                        ? 'bg-amber-500 text-slate-900'
                        : 'border border-slate-700 bg-slate-950 text-slate-300 hover:border-amber-400'
                    } ${pending && !isSelected ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {value}
                  </button>
                );
              })}
            </MovieCard>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-300">
            You have rated <span className="font-semibold text-amber-400">{ratedCount}</span> movie
            {ratedCount === 1 ? '' : 's'}.
          </p>
          <button
            type="button"
            onClick={handleContinue}
            disabled={ratedCount < MIN_REQUIRED_RATINGS}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue to recommendations
          </button>
        </div>
      </div>
    </div>
  );
}
