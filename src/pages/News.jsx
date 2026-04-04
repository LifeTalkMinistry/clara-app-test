import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Newspaper, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "../components/EmptyState";
import VideoPlayer from "../components/VideoPlayer";

const BILLBOARD_KEY = "clara_billboard";

const safeRead = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

function MediaBlock({ item }) {
  if (!item.media_url || item.media_type === "none") return null;

  if (item.media_type === "image") {
    return (
      <img
        src={item.media_url}
        alt={item.title}
        className="w-full max-h-72 object-cover rounded-xl mb-3"
      />
    );
  }

  return <VideoPlayer url={item.media_url} label={item.file_name} />;
}

export default function News() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allItems = safeRead(BILLBOARD_KEY);

    const activeItems = allItems
      .filter((item) => item.is_active === true)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .slice(0, 50);

    setItems(activeItems);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div>
          <h1 className="font-heading text-2xl font-bold">News & Updates</h1>
          <p className="text-sm text-muted-foreground">
            Announcements, lessons, and resources from CLARA
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No posts yet"
          description="Check back soon for updates and content from your coach."
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm"
            >
              <MediaBlock item={item} />

              <div className="p-4">
                <p className="font-heading font-bold text-base mb-1">
                  {item.title}
                </p>

                {item.body && (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {item.body}
                  </p>
                )}

                <p className="text-[10px] text-muted-foreground mt-3">
                  {item.created_date
                    ? new Date(item.created_date).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}