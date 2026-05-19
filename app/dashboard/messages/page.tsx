"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

interface Booking {
  id: number;
  customer_email: string;
}

interface Message {
  id: number;
  booking_id: number;
  sender: string;
  message: string;
  created_at: string;
}

export default function MessagesPage() {
  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [newMessage, setNewMessage] =
    useState("");

  async function fetchData() {
    const {
      data: bookingData,
    } = await supabase
      .from("bookings")
      .select("*")
      .order("id", {
        ascending: false,
      });

    if (bookingData) {
      setBookings(bookingData);

      const bookingIds =
        bookingData.map(
          (booking) =>
            booking.id
        );

      if (
        bookingIds.length > 0
      ) {
        const {
          data: messageData,
        } = await supabase
          .from("booking_messages")
          .select("*")
          .in(
            "booking_id",
            bookingIds
          )
          .order("created_at", {
            ascending: true,
          });

        if (messageData) {
          setMessages(messageData);
        }
      }
    }
  }

  async function sendReply(
    bookingId: number
  ) {
    if (!newMessage) {
      return;
    }

    await supabase
      .from("booking_messages")
      .insert({
        booking_id: bookingId,

        sender: "admin",

        message: newMessage,
      });

    await supabase
      .from("notifications")
      .insert({
        user_role: "client",

        content:
          "New admin reply received.",
      });

    setNewMessage("");

    fetchData();
  }

  useEffect(() => {
    fetchData();

    const channel =
      supabase
        .channel(
          "booking-messages-admin"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "booking_messages",
          },
          () => {
            fetchData();
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
          Messages
        </h1>
      </div>

      <div className="grid gap-6">
        {bookings.map((booking) => {
          const bookingMessages =
            messages.filter(
              (message) =>
                message.booking_id ===
                booking.id
            );

          return (
            <div
              key={booking.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-8"
            >
              <div className="mb-6">
                <h2 className="text-3xl font-semibold">
                  {
                    booking.customer_email
                  }
                </h2>
              </div>

              <div className="flex flex-col gap-4">
                {bookingMessages.map(
                  (message) => (
                    <div
                      key={message.id}
                      className="rounded-2xl border border-white/10 bg-black/40 p-4"
                    >
                      <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                        {message.sender}
                      </p>

                      <p className="mt-2 text-zinc-200">
                        {message.message}
                      </p>
                    </div>
                  )
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <input
                  type="text"
                  placeholder="Reply..."
                  value={newMessage}
                  onChange={(e) =>
                    setNewMessage(
                      e.target.value
                    )
                  }
                  className="flex-1 rounded-xl border border-white/10 bg-black px-4 py-3"
                />

                <button
                  onClick={() =>
                    sendReply(
                      booking.id
                    )
                  }
                  className="rounded-xl bg-white px-6 py-3 text-black"
                >
                  Send
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}