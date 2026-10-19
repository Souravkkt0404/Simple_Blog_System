import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { postsApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import useAsync from '../hooks/useAsync';
import PostForm from '../components/PostForm';
import Spinner from '../components/Spinner';

export function CreatePost() {
  const navigate = useNavigate();
  const { toast } = useNotifications();

  const handleSubmit = async (values) => {
    const post = await postsApi.create(values);
    toast('Post published', 'success');
    navigate(`/posts/${post.slug}`);
  };

  return (
    <div className="container narrow">
      <h1>Write a new post</h1>
      <PostForm submitLabel="Publish" onSubmit={handleSubmit} />
    </div>
  );
}

export function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useNotifications();
  const { data: post, loading, error } = useAsync(() => postsApi.get(id), [id]);

  if (loading) return <Spinner />;
  if (error) return <div className="container narrow alert alert-error">{error}</div>;
  if (!isAdmin && post.author?._id !== user.id) return <Navigate to={`/posts/${post.slug}`} replace />;

  const handleSubmit = async (values) => {
    const updated = await postsApi.update(post._id, values);
    toast('Post updated', 'success');
    navigate(`/posts/${updated.slug}`);
  };

  return (
    <div className="container narrow">
      <h1>Edit post</h1>
      <PostForm initialValues={post} submitLabel="Save changes" onSubmit={handleSubmit} />
    </div>
  );
}
