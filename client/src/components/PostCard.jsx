import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import { formatDate } from '../utils/format';

export default function PostCard({ post, actions }) {
  return (
    <article className="card post-card">
      <Link to={`/posts/${post.slug}`} className="post-card-title">
        <h2>{post.title}</h2>
      </Link>
      <p className="post-card-excerpt">{post.excerpt}</p>
      {post.tags?.length > 0 && (
        <div className="tags">
          {post.tags.map((t) => (
            <Link key={t} to={`/?tag=${t}`} className="tag">
              #{t}
            </Link>
          ))}
        </div>
      )}
      <footer className="post-card-footer">
        <span className="author">
          <Avatar user={post.author} size={24} />
          {post.author?.name || 'Deleted user'}
        </span>
        <span className="muted">
          {formatDate(post.createdAt)} · {post.commentCount} comment{post.commentCount === 1 ? '' : 's'}
        </span>
        {actions && <span className="post-card-actions">{actions}</span>}
      </footer>
    </article>
  );
}
