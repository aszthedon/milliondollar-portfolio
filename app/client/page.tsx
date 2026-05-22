"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

interface Booking {
  id: number;
  booking_date: string;
  booking_time: string;
  payment_status: string;
  status: string;
  notes: string;
  service_id: number;
  customer_email: string;
  meeting_link: string;
}

interface ClientFile {
  id: number;
  booking_id: number;
  file_name: string;
  file_url: string;
}

interface Message {
  id: number;
  booking_id: number;
  sender: string;
  message: string;
  created_at: string;
}

export default function ClientPage() {
  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [files, setFiles] =
    useState<ClientFile[]>([]);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [newMessage, setNewMessage] =
    useState("");

  const [newDate, setNewDate] =
    useState("");

  const [newTime, setNewTime] =
    useState("");

  async function fetchBookings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("client_id", user.id)
      .order("id", {
        ascending: false,
      });

    if (data) {
      setBookings(data);

      const bookingIds =
        data.map(
          (booking) =>
            booking.id
        );

      if (
        bookingIds.length > 0
      ) {
        const {
          data: fileData,
        } = await supabase
          .from("client_files")
          .select("*")
          .in(
            "booking_id",
            bookingIds
          );

        if (fileData) {
          setFiles(fileData);
        }

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

  async function sendMessage(
    bookingId: number
  ) {
    if (!newMessage) {
      return;
    }

    await supabase
      .from("booking_messages")
      .insert({
        booking_id: bookingId,

        sender: "client",

        message: newMessage,
      });

    await supabase
      .from("notifications")
      .insert({
        user_role: "admin",

        content:
          "New client message received.",
      });

    setNewMessage("");

    fetchBookings();
  }

  async function rescheduleBooking(
    booking: Booking
  ) {
    if (!newDate || !newTime) {
      alert(
        "Select a new date and time."
      );

      return;
    }

    await supabase
      .from("availability")
      .insert({
        available_date:
          booking.booking_date,

        available_time:
          booking.booking_time,
      });

    await supabase
      .from("availability")
      .delete()
      .eq(
        "available_date",
        newDate
      )
      .eq(
        "available_time",
        newTime
      );

    await supabase
      .from("bookings")
      .update({
        booking_date: newDate,

        booking_time: newTime,

        status: "rescheduled",
      })
      .eq("id", booking.id);

    alert(
      "Booking rescheduled!"
    );

    setNewDate("");
    setNewTime("");

    fetchBookings();
  }

  async function cancelBooking(
    booking: Booking
  ) {
    const confirmed = window.confirm(
      "Cancel this booking?"
    );

    if (!confirmed) return;

    await supabase
      .from("bookings")
      .update({
        status: "cancelled",
      })
      .eq("id", booking.id);

    await supabase
      .from("availability")
      .insert({
        available_date:
          booking.booking_date,

        available_time:
          booking.booking_time,
      });

    fetchBookings();
  }

  useEffect(() => {
    fetchBookings();

    const channel =
      supabase
        .channel(
          "booking-messages-client"
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
            fetchBookings();
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
          Client Dashboard
        </p>

        <h1 className="text-5xl font-bold">
          Your Bookings
        </h1>
      </div>

      <div className="grid gap-6">
        {bookings.map((booking) => {
          const bookingFiles =
            files.filter(
              (file) =>
                file.booking_id ===
                booking.id
            );

          return (
            <div
              key={booking.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-8"
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-3xl font-semibold">
                    {
                      booking.booking_date
                    }
                  </h2>

                  <p className="mt-2 text-zinc-400">
                    {
                      booking.booking_time
                    }
                  </p>

                  <p className="mt-6 whitespace-pre-wrap text-zinc-300">
                    {booking.notes}
                  </p>

                  {booking.meeting_link && (
                    <a
                      href={
                        booking.meeting_link
                      }
                      target="_blank"
                      className="mt-4 inline-block rounded-full border border-green-500 px-4 py-2 text-sm text-green-400 transition hover:bg-green-500 hover:text-white"
                    >
                      Join Meeting
                    </a>
                  )}

                  {bookingFiles.length >
                    0 && (
                    <div className="mt-8">
                      <h3 className="mb-4 text-xl font-semibold">
                        Files
                      </h3>

                      <div className="flex flex-col gap-3">
                        {bookingFiles.map(
                          (file) => (
                            <a
                              key={
                                file.id
                              }
                              href={
                                file.file_url
                              }
                              target="_blank"
                              className="rounded-xl border border-white/10 px-4 py-3 transition hover:bg-white hover:text-black"
                            >
                              {
                                file.file_name
                              }
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-8">
                    <h3 className="mb-4 text-xl font-semibold">
                      Messages
                    </h3>

                    <div className="flex flex-col gap-3">
                      {messages
                        .filter(
                          (
                            message
                          ) =>
                            message.booking_id ===
                            booking.id
                        )
                        .map(
                          (
                            message
                          ) => (
                            <div
                              key={
                                message.id
                              }
                              className="rounded-2xl border border-white/10 bg-black/40 p-4"
                            >
                              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                                {
                                  message.sender
                                }
                              </p>

                              <p className="mt-2 text-zinc-200">
                                {
                                  message.message
                                }
                              </p>
                            </div>
                          )
                        )}
                    </div>

                    <div className="mt-4 flex gap-3">
                      <input
                        type="text"
                        placeholder="Send message..."
                        value={
                          newMessage
                        }
                        onChange={(
                          e
                        ) =>
                          setNewMessage(
                            e.target
                              .value
                          )
                        }
                        className="flex-1 rounded-xl border border-white/10 bg-black px-4 py-3"
                      />

                      <button
                        onClick={() =>
                          sendMessage(
                            booking.id
                          )
                        }
                        className="rounded-xl bg-white px-6 py-3 text-black"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="rounded-full border border-white/10 px-4 py-2 text-sm">
                    Booking Status:{" "}
                    {booking.status}
                  </div>

                  <div className="rounded-full border border-green-500 px-4 py-2 text-sm text-green-400">
                    Payment:{" "}
                    {
                      booking.payment_status
                    }
                  </div>

                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) =>
                      setNewDate(
                        e.target
                          .value
                      )
                    }
                    className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm"
                  />

                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) =>
                      setNewTime(
                        e.target
                          .value
                      )
                    }
                    className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm"
                  />

                  <button
                    onClick={() =>
                      rescheduleBooking(
                        booking
                      )
                    }
                    className="rounded-full border border-blue-500 px-4 py-2 text-sm text-blue-400 transition hover:bg-blue-500 hover:text-white"
                  >
                    Reschedule
                  </button>

                  {booking.status !==
                    "cancelled" && (
                    <button
                      onClick={() =>
                        cancelBooking(
                          booking
                        )
                      }
                      className="rounded-full border border-red-500 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500 hover:text-white"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}