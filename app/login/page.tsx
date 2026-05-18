"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Logged in successfully!");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-10">
        <h1 className="mb-8 text-4xl font-bold">
          Login
        </h1>

        <div className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="rounded-xl border border-white/10 bg-black px-4 py-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="rounded-xl border border-white/10 bg-black px-4 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            className="mt-4 rounded-full bg-white px-6 py-3 font-medium text-black"
          >
            Login
          </button>
        </div>
      </div>
    </main>
  );
}