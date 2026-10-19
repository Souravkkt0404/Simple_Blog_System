import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Toasts from './components/Toasts';
import ProtectedRoute, { GuestRoute } from './components/ProtectedRoute';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import { CreatePost, EditPost } from './pages/PostEditor';
import MyPosts from './pages/MyPosts';
import Profile from './pages/Profile';
import { Login, Register, OAuthCallback } from './pages/AuthPages';
import NotFound from './pages/NotFound';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import Posts from './pages/admin/Posts';
import Comments from './pages/admin/Comments';
import Activity from './pages/admin/Activity';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/posts/:slug" element={<PostDetail />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />

          {/* Guests only */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Any authenticated user */}
          <Route element={<ProtectedRoute />}>
            <Route path="/posts/new" element={<CreatePost />} />
            <Route path="/posts/:id/edit" element={<EditPost />} />
            <Route path="/my-posts" element={<MyPosts />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Admins only */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="posts" element={<Posts />} />
              <Route path="comments" element={<Comments />} />
              <Route path="activity" element={<Activity />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Toasts />
    </>
  );
}
