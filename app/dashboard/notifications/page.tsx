"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

interface Notification {
  id: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [
    notifications,
    setNotifications,
  ] = useState<
    Notification[]
  >([]);

  async function fetchNotifications() {
    const { data } =
      await supabase
        .from("notifications")
        .select("*")
        .eq(
          "user_role",
          "admin"
        )
        .order("created_at", {
          ascending: false,
        });

    if (data) {
      setNotifications(data);
    }
  }

  async function markAsRead(
    id: number
  ) {
    await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", id);

    fetchNotifications();
  }

  useEffect(() => {
    fetchNotifications();

    const channel =
      supabase
        .channel(
          "admin-notifications"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "notifications",
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, []);

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="mb-12">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
          Dashboard
        </p>

        <h1 className="text-5xl font-bold">
          Notifications
        </h1>
      </div>

      <div className="grid gap-4">
        {notifications.map(
          (notification) => (
            <div
              key={notification.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg">
                    {
                      notification.content
                    }
                  </p>

                  <p className="mt-2 text-sm text-zinc-500">
                    {
                      notification.created_at
                    }
                  </p>
                </div>

                {!notification.is_read && (
                  <button
                    onClick={() =>
                      markAsRead(
                        notification.id
                      )
                    }
                    className="rounded-full bg-white px-6 py-3 text-black"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          )
        )}

        {notifications.length ===
          0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <p className="text-zinc-400">
              No notifications.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}