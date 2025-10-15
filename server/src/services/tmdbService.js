import pool from '../config/db.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const GENRE_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

let cachedGenres = null;
let lastGenreFetch = 0;

function assertTmdbCredentials() {
  const readToken = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!readToken && !apiKey) {
    throw new Error('TMDB credentials are missing. Configure TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY');
  }
  return { readToken, apiKey };
}

async function tmdbFetch(path, params = {}) {
  const { readToken, apiKey } = assertTmdbCredentials();
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, value);
    }
  });
  if (!readToken && apiKey) {
    // v3 key fallback
    url.searchParams.append('api_key', apiKey);
  }

  const response = await fetch(url.href, {
    headers: {
      Accept: 'application/json',
      ...(readToken ? { Authorization: `Bearer ${readToken}` } : {})
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`TMDB request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  return response.json();
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normaliseText(value, fallback = 'Synopsis unavailable.') {
  if (!value || !value.trim()) {
    return fallback;
  }
  return value.trim();
}

function parseReleaseYear(movie) {
  const date = movie.release_date || movie.first_air_date;
  if (!date) {
    return null;
  }
  const year = Number.parseInt(date.slice(0, 4), 10);
  if (Number.isNaN(year)) {
    return null;
  }
  return year;
}

function buildPosterUrl(path) {
  if (!path) {
    return null;
  }
  return `${TMDB_IMAGE_BASE_URL}${path}`;
}

function mapTmdbMovie(movie, primaryGenreName) {
  if (!movie || !movie.id) {
    return null;
  }

  const releaseYear = parseReleaseYear(movie);
  const voteAverage = Number.isFinite(movie.vote_average) ? movie.vote_average : 0;
  const criticRating = Math.round(Math.max(0, Math.min(10, voteAverage)) * 10) / 10;

  return {
    tmdbId: movie.id,
    title: normaliseText(movie.title || movie.name || 'Untitled'),
    genre: primaryGenreName,
    synopsis: normaliseText(movie.overview),
    releaseYear,
    criticRating,
    posterUrl: buildPosterUrl(movie.poster_path)
  };
}

async function saveMovies(movieRecords) {
  const uniqueRecords = new Map();
  movieRecords.forEach((record) => {
    if (record?.tmdbId) {
      uniqueRecords.set(record.tmdbId, record);
    }
  });

  if (uniqueRecords.size === 0) {
    return [];
  }

  const payload = Array.from(uniqueRecords.values());
  const placeholders = payload.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',');
  const params = [];

  payload.forEach((record) => {
    params.push(
      record.tmdbId,
      record.title,
      record.genre,
      record.synopsis,
      record.releaseYear,
      record.criticRating,
      record.posterUrl
    );
  });

  await pool.query(
    `INSERT INTO movies (tmdb_id, title, genre, synopsis, release_year, critic_rating, poster_url)
     VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       genre = VALUES(genre),
       synopsis = VALUES(synopsis),
       release_year = VALUES(release_year),
       critic_rating = VALUES(critic_rating),
       poster_url = VALUES(poster_url)`,
    params
  );

  const tmdbIds = payload.map((record) => record.tmdbId);
  const [rows] = await pool.query(
    `SELECT id, tmdb_id, title, genre, synopsis, release_year, critic_rating, poster_url
     FROM movies
     WHERE tmdb_id IN (?)`,
    [tmdbIds]
  );

  const rowMap = new Map(rows.map((row) => [row.tmdb_id, row]));
  return tmdbIds
    .map((tmdbId) => rowMap.get(tmdbId))
    .filter(Boolean)
    .map((row) => ({ ...row }));
}

export async function getTmdbGenres() {
  const now = Date.now();
  if (cachedGenres && now - lastGenreFetch < GENRE_CACHE_TTL_MS) {
    return cachedGenres;
  }

  const payload = await tmdbFetch('/genre/movie/list', { language: 'en-US' });
  cachedGenres = payload?.genres || [];
  lastGenreFetch = now;
  return cachedGenres;
}

async function fetchMoviesForGenre(genre, limit, { minVoteCount = 200 } = {}) {
  const page = Math.max(1, Math.floor(Math.random() * 5) + 1); // random page 1-5 for variety
  const data = await tmdbFetch('/discover/movie', {
    with_genres: genre.id,
    sort_by: 'vote_average.desc',
    include_adult: 'false',
    include_video: 'false',
    language: 'en-US',
    page,
    'vote_count.gte': minVoteCount
  });

  if (!data?.results?.length) {
    return [];
  }

  return data.results
    .filter((movie) => {
      const voteCount = typeof movie.vote_count === 'number' ? movie.vote_count : 0;
      return movie.vote_average && voteCount >= minVoteCount;
    })
    .slice(0, limit)
    .map((movie) => mapTmdbMovie(movie, genre.name))
    .filter(Boolean);
}

async function fetchTrendingMovies(limit = 20) {
  const [data, genres] = await Promise.all([
    tmdbFetch('/trending/movie/week', { language: 'en-US' }),
    getTmdbGenres()
  ]);

  const genreMap = new Map(genres.map((genre) => [genre.id, genre.name]));

  if (!data?.results?.length) {
    return [];
  }
  return data.results
    .slice(0, limit)
    .map((movie) => {
      const primaryGenreId = movie.genre_ids?.[0];
      const primaryGenreName = primaryGenreId ? genreMap.get(primaryGenreId) || 'Trending' : 'Trending';
      return mapTmdbMovie(movie, primaryGenreName);
    })
    .filter(Boolean);
}

async function seedMoviesForGenresInternal({
  includeGenreNames = [],
  excludeGenreNames = [],
  genresToPick = 3,
  moviesPerGenre = 6
}) {
  const genres = await getTmdbGenres();
  let targetGenres;

  if (includeGenreNames.length > 0) {
    const includeSet = new Set(includeGenreNames);
    targetGenres = genres.filter((genre) => includeSet.has(genre.name));
  } else {
    const excludeSet = new Set(excludeGenreNames);
    targetGenres = genres.filter((genre) => !excludeSet.has(genre.name));
    targetGenres = shuffle(targetGenres).slice(0, Math.min(genresToPick, targetGenres.length));
  }

  const movieRecords = [];

  for (const genre of targetGenres) {
    const movies = await fetchMoviesForGenre(genre, moviesPerGenre);
    movieRecords.push(...movies);
  }

  if (movieRecords.length === 0) {
    movieRecords.push(...(await fetchTrendingMovies(genresToPick * moviesPerGenre)));
  }

  return saveMovies(movieRecords);
}

export async function seedMoviesForGenres(options = {}) {
  return seedMoviesForGenresInternal(options);
}

export async function fetchOnboardingMovies({ total = 20 } = {}) {
  const seeded = await seedMoviesForGenresInternal({ genresToPick: 6, moviesPerGenre: 6 });
  const unique = new Map();
  seeded.forEach((movie) => {
    if (movie?.id) {
      unique.set(movie.id, movie);
    }
  });

  if (unique.size < total) {
    const [existing] = await pool.query(
      `SELECT id, tmdb_id, title, genre, synopsis, release_year, critic_rating, poster_url
       FROM movies
       ORDER BY RAND()
       LIMIT ?`,
      [total]
    );
    existing.forEach((movie) => {
      if (movie?.id && !unique.has(movie.id)) {
        unique.set(movie.id, movie);
      }
    });
  }

  return shuffle(Array.from(unique.values())).slice(0, total);
}

export async function seedMoviesOutsideFavoriteGenres(favoriteGenres, { genresToPick = 3, moviesPerGenre = 8 } = {}) {
  return seedMoviesForGenresInternal({
    excludeGenreNames: favoriteGenres,
    genresToPick,
    moviesPerGenre
  });
}

export async function ensureTrendingSeed(limit = 20) {
  const seeded = await fetchTrendingMovies(limit);
  return saveMovies(seeded);
}
