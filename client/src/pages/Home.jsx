import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { postsApi } from '../api/services';
import useAsync from '../hooks/useAsync';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';

export default function Home() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const search = params.get('search') || '';
  const tag = params.get('tag') || '';
  const sort = params.get('sort') || 'newest';
  const [searchInput, setSearchInput] = useState(search);
  const [hasNewPosts, setHasNewPosts] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () => postsApi.list({ page, limit: 9, search: search || undefined, tag: tag || undefined, sort }),
    [page, search, tag, sort],
  );

  // Real-time: the socket layer re-dispatches "post:created" as a window event.
  useEffect(() => {
    const onNewPost = () => setHasNewPosts(true);
    window.addEventListener('blog:post-created', onNewPost);
    return () => window.removeEventListener('blog:post-created', onNewPost);
  }, []);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const onSearch = (e) => {
    e.preventDefault();
    update({ search: searchInput.trim(), page: '' });
  };

  return (
    <div className="container">
      <section className="hero">
        <h1>Stories, ideas &amp; tutorials</h1>
        <p className="muted">Read what the community is writing, or share something of your own.</p>
        <form className="search-bar" onSubmit={onSearch}>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search posts…"
            aria-label="Search posts"
          />
          <select value={sort} onChange={(e) => update({ sort: e.target.value, page: '' })} aria-label="Sort">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="popular">Most discussed</option>
          </select>
          <button className="btn btn-primary">Search</button>
        </form>
        {(search || tag) && (
          <p className="filter-note">
            {search && <>Results for “{search}” </>}
            {tag && <>Tagged #{tag} </>}
            <button className="link-btn" onClick={() => { setSearchInput(''); update({ search: '', tag: '', page: '' }); }}>
              Clear filters
            </button>
          </p>
        )}
      </section>

      {hasNewPosts && (
        <button className="new-posts-banner" onClick={() => { setHasNewPosts(false); update({ page: '' }); reload(); }}>
          New posts published — click to refresh
        </button>
      )}

      {loading && <Spinner />}
      {error && <div className="alert alert-error">{error}</div>}
      {data && (
        <>
          {data.items.length === 0 && <p className="empty">No posts found.</p>}
          <div className="post-grid">
            {data.items.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
          <Pagination meta={data.meta} onChange={(p) => update({ page: String(p) })} />
        </>
      )}
    </div>
  );
}
