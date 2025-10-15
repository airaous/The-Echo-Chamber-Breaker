import React from 'react';

export default function MovieCard({ movie, children }) {
  const releaseYearLabel = movie.release_year ? movie.release_year : 'TBA';
  const criticScore = typeof movie.critic_rating === 'number'
    ? movie.critic_rating.toFixed(1)
    : Number(movie.critic_rating || 0).toFixed(1);

  return (
    <article className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-sm transition hover:border-slate-500">
      {movie.poster_url ? (
        <img
          src={movie.poster_url}
          alt={`${movie.title} poster`}
          className="h-64 w-full rounded-xl object-cover"
          loading="lazy"
        />
      ) : null}
      <header>
        <h3 className="text-lg font-semibold text-white">{movie.title}</h3>
        <p className="text-sm text-slate-400">
          {movie.genre} • {releaseYearLabel}
        </p>
      </header>
      <p className="text-sm text-slate-300">{movie.synopsis}</p>
      <div className="mt-auto flex items-center justify-between text-sm text-amber-400">
        Critic Rating: {criticScore}
      </div>
      {children ? <div className="mt-3 flex gap-2">{children}</div> : null}
    </article>
  );
}
