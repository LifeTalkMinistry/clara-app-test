import { useState, useEffect } from "react";
import {
  MessageCircle,
  Heart,
  Send,
  Users,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";

const STORAGE_KEYS = {
  communityPosts: "clara_community_posts",
};

const getStoredData = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setStoredData = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function Community() {
  const { user, isPaid, isAdmin } = useUserRole();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [commentTexts, setCommentTexts] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    const allPosts = getStoredData(STORAGE_KEYS.communityPosts);

    const sortedPosts = [...allPosts].sort((a, b) => {
      const aDate = new Date(a.created_date || a.created_at || 0).getTime();
      const bDate = new Date(b.created_date || b.created_at || 0).getTime();
      return bDate - aDate;
    });

    setPosts(sortedPosts);
    setLoading(false);
  }, []);

  const savePosts = (updatedPosts) => {
    setStoredData(STORAGE_KEYS.communityPosts, updatedPosts);
    setPosts(updatedPosts);
  };

  const handlePost = async () => {
    if (!newPost.trim() || !isPaid) return;

    const newCommunityPost = {
      id: generateId(),
      created_by: user?.email || "",
      author_name: user?.full_name || "Anonymous",
      content: newPost.trim(),
      likes: 0,
      liked_by: [],
      comments: [],
      created_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const updatedPosts = [newCommunityPost, ...posts];
    savePosts(updatedPosts);
    setNewPost("");
  };

  const handleLike = async (post) => {
    if (!isPaid || !user?.email) return;

    const likedBy = post.liked_by || [];
    const alreadyLiked = likedBy.includes(user.email);

    const newLikedBy = alreadyLiked
      ? likedBy.filter((email) => email !== user.email)
      : [...likedBy, user.email];

    const updatedPosts = posts.map((p) =>
      p.id === post.id
        ? {
            ...p,
            liked_by: newLikedBy,
            likes: newLikedBy.length,
          }
        : p
    );

    savePosts(updatedPosts);
  };

  const handleDelete = async (postId) => {
    const updatedPosts = posts.filter((p) => p.id !== postId);
    savePosts(updatedPosts);
  };

  const handleEditSave = async (postId) => {
    if (!editContent.trim()) return;

    const updatedPosts = posts.map((p) =>
      p.id === postId
        ? {
            ...p,
            content: editContent.trim(),
            updated_at: new Date().toISOString(),
          }
        : p
    );

    savePosts(updatedPosts);
    setEditingPostId(null);
    setEditContent("");
  };

  const handleComment = async (postId) => {
    const text = commentTexts[postId];
    if (!text?.trim() || !isPaid || !user?.email) return;

    const updatedPosts = posts.map((post) => {
      if (post.id !== postId) return post;

      const newComments = [
        ...(post.comments || []),
        {
          id: generateId(),
          author: user.email,
          author_name: user?.full_name || "Anonymous",
          content: text.trim(),
          date: new Date().toISOString(),
        },
      ];

      return {
        ...post,
        comments: newComments,
        updated_at: new Date().toISOString(),
      };
    });

    savePosts(updatedPosts);
    setCommentTexts({ ...commentTexts, [postId]: "" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Community"
        subtitle={isPaid ? "Share your journey" : "Read-only for free members"}
      />

      {isPaid && (
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <Textarea
            placeholder="Share something with the community..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" onClick={handlePost} disabled={!newPost.trim()}>
              <Send className="w-3.5 h-3.5 mr-1" />
              Post
            </Button>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No posts yet"
          description="Be the first to share your financial journey!"
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-card rounded-xl border border-border p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-xs">
                    {(post.author_name || "?")[0].toUpperCase()}
                  </span>
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium">{post.author_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(
                      post.created_date || post.created_at
                    ).toLocaleDateString()}
                  </p>
                </div>

                {(post.created_by === user?.email || isAdmin) && (
                  <div className="flex items-center gap-1">
                    {post.created_by === user?.email &&
                      editingPostId !== post.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingPostId(post.id);
                            setEditContent(post.content);
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {editingPostId === post.id ? (
                <div className="mb-3">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="mb-2"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEditSave(post.id)}>
                      <Check className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingPostId(null);
                        setEditContent("");
                      }}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm mb-3 whitespace-pre-wrap">
                  {post.content}
                </p>
              )}

              <div className="flex items-center gap-4 mb-3">
                <button
                  onClick={() => handleLike(post)}
                  disabled={!isPaid}
                  className={`flex items-center gap-1 text-xs ${
                    post.liked_by?.includes(user?.email)
                      ? "text-destructive"
                      : "text-muted-foreground"
                  } ${
                    isPaid ? "hover:text-destructive" : "cursor-default"
                  } transition-colors`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      post.liked_by?.includes(user?.email) ? "fill-current" : ""
                    }`}
                  />
                  {post.likes || 0}
                </button>

                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  {post.comments?.length || 0}
                </span>
              </div>

              {post.comments?.length > 0 && (
                <div className="space-y-2 mb-3 pl-4 border-l-2 border-border">
                  {post.comments.map((c, i) => (
                    <div key={c.id || i} className="text-xs">
                      <span className="font-medium">{c.author_name}</span>
                      <span className="text-muted-foreground ml-2">
                        {c.content}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {isPaid && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a comment..."
                    className="text-sm h-8"
                    value={commentTexts[post.id] || ""}
                    onChange={(e) =>
                      setCommentTexts({
                        ...commentTexts,
                        [post.id]: e.target.value,
                      })
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleComment(post.id)
                    }
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => handleComment(post.id)}
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}