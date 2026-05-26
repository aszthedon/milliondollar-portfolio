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

  const [loadingId, setLoadingId] =
    useState<number | null>(
      null
    );

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
        bookingIds.length >
        0
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
          setFiles(
            fileData
          );
        }

        const {
          data: messageData,
        } = await supabase
          .from(
            "booking_messages"
          )
          .select("*")
          .in(
            "booking_id",
            bookingIds
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            }
          );

        if (
          messageData
        ) {
          setMessages(
            messageData
          );
        }
      }
    }
  }

  async function sendMessage(
    bookingId: number
  ) {
    if (!newMessage)
      return;

    await supabase
      .from(
        "booking_messages"
      )
      .insert({
        booking_id:
          bookingId,

        sender:
          "client",

        message:
          newMessage,
      });

    await supabase
      .from(
        "notifications"
      )
      .insert({
        user_role:
          "admin",

        content:
          "New client message received.",
      });

    setNewMessage("");

    fetchBookings();
  }

  async function rescheduleBooking(
  booking: Booking
) {
  if (
    !newDate ||
    !newTime
  ) {
    alert(
      "Select a new date and time."
    );

    return;
  }

  try {
    setLoadingId(
      booking.id
    );

    const response =
      await fetch(
        "/api/bookings/reschedule",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              {
                bookingId:
                  booking.id,

                newDate,

                newTime,
              }
            ),
        }
      );

    const data =
      await response.json();

    if (
      !response.ok
    ) {
      throw new Error(
        data.error ??
          "Reschedule failed."
      );
    }

    alert(
      "Booking rescheduled!"
    );

    setNewDate("");
    setNewTime("");

    await fetchBookings();

    setLoadingId(
      null
    );
  } catch (error) {
    console.error(
      error
    );

    alert(
      error instanceof
        Error
        ? error.message
        : "Reschedule failed."
    );

    setLoadingId(
      null
    );
  }
}

  async function cancelBooking(
    booking: Booking
  ) {
    const confirmed =
      window.confirm(
        "Cancel this booking?"
      );

    if (!confirmed)
      return;

    try {
      setLoadingId(
        booking.id
      );

      const response =
        await fetch(
          "/api/bookings/cancel",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  bookingId:
                    booking.id,
                }
              ),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            "Cancellation failed."
        );
      }

      await fetchBookings();

      setLoadingId(
        null
      );
    } catch (
      error
    ) {
      console.error(
        error
      );

      alert(
        "Cancellation failed."
      );

      setLoadingId(
        null
      );
    }
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
            schema:
              "public",
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
        {bookings.map(
          (booking) => {
            const bookingFiles =
              files.filter(
                (file) =>
                  file.booking_id ===
                  booking.id
              );

            return (
              <div
                key={
                  booking.id
                }
                className="rounded-3xl border border-white/10 bg-white/5 p-8"
              >
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">

                  {/* existing left content unchanged */}

                  <div className="flex flex-col gap-3">

                    <div className="rounded-full border border-white/10 px-4 py-2 text-sm">
                      Booking Status:{" "}
                      {
                        booking.status
                      }
                    </div>

                    <div className="rounded-full border border-green-500 px-4 py-2 text-sm text-green-400">
                      Payment:{" "}
                      {
                        booking.payment_status
                      }
                    </div>

                    <input
                      type="date"
                      value={
                        newDate
                      }
                      onChange={(
                        e
                      ) =>
                        setNewDate(
                          e.target
                            .value
                        )
                      }
                      className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm"
                    />

                    <input
                      type="time"
                      value={
                        newTime
                      }
                      onChange={(
                        e
                      ) =>
                        setNewTime(
                          e.target
                            .value
                        )
                      }
                      className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm"
                    />

                    <button
                        disabled={
                          loadingId ===
                          booking.id
                        }
                        onClick={() =>
                          rescheduleBooking(
                            booking
                          )
                        }
                        className="rounded-full border border-blue-500 px-4 py-2 text-sm text-blue-400 transition hover:bg-blue-500 hover:text-white disabled:opacity-50"
                      >
                        {loadingId ===
                        booking.id
                          ? "Rescheduling..."
                          : "Reschedule"}
                      </button>

                    {booking.status !==
                      "cancelled" && (
                      <button
                        disabled={
                          loadingId ===
                          booking.id
                        }
                        onClick={() =>
                          cancelBooking(
                            booking
                          )
                        }
                        className="rounded-full border border-red-500 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                      >
                        {loadingId ===
                        booking.id
                          ? "Cancelling..."
                          : "Cancel Booking"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>
    </main>
  );
}