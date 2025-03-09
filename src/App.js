import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";

const socket = io("https://your-backend-url.com"); // Replace with actual backend URL

// 🌟 Reusable UI Components
const Card = ({ children }) => (
  <div className="border p-6 rounded-xl shadow-lg bg-white transition hover:shadow-2xl duration-200">
    {children}
  </div>
);

const Button = ({ children, ...props }) => (
  <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-300 shadow-md active:scale-95 focus:ring-2 focus:ring-blue-400" {...props}>
    {children}
  </button>
);

const Textarea = (props) => (
  <textarea className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none transition shadow-sm" {...props} />
);

const Input = (props) => (
  <input className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none transition shadow-sm" {...props} />
);

const Navbar = () => (
  <nav className="w-full bg-blue-600 text-white p-5 shadow-md flex justify-between items-center">
    <h1 className="text-2xl font-semibold tracking-wide">💬 Exploration Chatboard</h1>
  </nav>
);

// 🗨️ Recursive Comment Component
const Comment = ({ comment, addReply }) => {
  const [reply, setReply] = useState("");
  const [showReply, setShowReply] = useState(false);

  const handleReply = () => {
    if (reply.trim()) {
      addReply(reply, comment);
      setReply("");
      setShowReply(false);
    }
  };

  return (
    <div className="mt-3 border-l-4 pl-4 border-gray-300">
      <div className="p-4 rounded-lg shadow-sm bg-gray-100">
        <p className="text-gray-900">{comment.text}</p>
        <button className="text-blue-500 text-xs mt-1 font-medium hover:underline" onClick={() => setShowReply(!showReply)}>
          {showReply ? "Cancel" : "Reply"}
        </button>
      </div>
      {showReply && (
        <div className="mt-2 space-y-2">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to this comment..." />
          <Button className="w-fit" onClick={handleReply}>Post Reply</Button>
        </div>
      )}
      {comment.replies.length > 0 && (
        <div className="ml-6 mt-2 space-y-2">
          {comment.replies.map((subComment, index) => (
            <Comment key={index} comment={subComment} addReply={addReply} />
          ))}
        </div>
      )}
    </div>
  );
};

// 🌟 Main Chatboard Component
export default function App() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    socket.on("new_post", (post) => {
      setPosts((prev) => [post, ...prev]); // 🔄 Most recent posts first
    });
    return () => socket.off("new_post");
  }, []);

  const createPost = () => {
    if (!newPost.trim()) {
      toast.error("Post content cannot be empty!");
      return;
    }
    const post = { text: newPost, comments: [], id: Date.now() };
    socket.emit("create_post", post);
    setPosts((prev) => [post, ...prev]); // 🔄 Most recent posts first
    setNewPost("");
  };

  const addComment = (postId, commentText, parentComment = null) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const newComment = { text: commentText, replies: [] };

          const insertReply = (comments) =>
            comments.map((comment) =>
              comment === parentComment
                ? { ...comment, replies: [...comment.replies, newComment] }
                : { ...comment, replies: insertReply(comment.replies) }
            );

          return {
            ...post,
            comments: parentComment ? insertReply(post.comments) : [...post.comments, newComment],
          };
        }
        return post;
      })
    );
  };

  const filteredPosts = posts.filter(post => 
    post.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
    post.comments.some(comment => comment.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        
        {/* 🔍 Search Input */}
        <Input
          type="text"
          placeholder="🔍 Search posts and comments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* 📌 Posts Section */}
        <div className="space-y-4 max-h-[500px] overflow-y-auto border p-4 rounded-xl bg-white shadow-md">
          {filteredPosts.map((post) => (
            <Card key={post.id}>
              <p className="text-lg font-semibold text-gray-900">{post.text}</p>
              <small className="text-gray-500">Anonymous</small>
              <div className="mt-3 space-y-3">
                {post.comments.map((comment, index) => (
                  <Comment key={index} comment={comment} addReply={(text, parent) => addComment(post.id, text, parent)} />
                ))}
              </div>
              <Textarea
                placeholder="Reply to this post..."
                className="mt-3"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    addComment(post.id, e.target.value);
                    e.target.value = "";
                  }
                }}
              />
            </Card>
          ))}
        </div>

        {/* 📝 Create Post Section */}
        <Textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="📝 Share something anonymously..."
        />
        <Button onClick={createPost} className="w-full">Post</Button>
      </div>
    </div>
  );
}
