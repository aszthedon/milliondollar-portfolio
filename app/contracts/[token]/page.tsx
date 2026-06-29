"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { supabase } from "@/lib/supabase";

interface ClientContract {
  id: number;
  contract_number: string | null;
  signing_token: string;
  client_name: string | null;
  client_email: string;
  title: string;
  content: string;
  project_value: number | null;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  signer_email: string | null;
  signature_text: string | null;
  due_date: string | null;
  notes: string | null;
}

function formatMoney(value: number | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function ContractSigningPage() {
  const params = useParams();
  const token = String(params.token ?? "");

  const [contract, setContract] =
    useState<ClientContract | null>(null);

  const [signerName, setSignerName] =
    useState("");

  const [signerEmail, setSignerEmail] =
    useState("");

  const [signatureText, setSignatureText] =
    useState("");

  const [agreed, setAgreed] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [signing, setSigning] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function fetchContract() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("client_contracts")
        .select("*")
        .eq("signing_token", token)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setError("This contract could not be found.");
        return;
      }

      setContract(data as ClientContract);

      if (!data.viewed_at && data.status !== "signed") {
        await supabase
          .from("client_contracts")
          .update({
            viewed_at: new Date().toISOString(),
          })
          .eq("id", data.id);
      }

      if (data.client_name) {
        setSignerName(data.client_name);
      }

      if (data.client_email) {
        setSignerEmail(data.client_email);
      }
    } catch (error) {
      console.error("CONTRACT FETCH ERROR:", error);
      setError("Contract could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      fetchContract();
    }
  }, [token]);

  async function signContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSigning(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/contracts/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          signer_name: signerName,
          signer_email: signerEmail,
          signature_text: signatureText,
          agreed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Contract could not be signed.");
      }

      setSuccess("Contract signed successfully.");
      await fetchContract();
    } catch (error) {
      console.error("SIGN CONTRACT ERROR:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Contract could not be signed."
      );
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Loading
          </p>

          <h1 className="mt-4 text-3xl font-bold">
            Loading Contract...
          </h1>
        </div>
      </main>
    );
  }

  if (!contract) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="max-w-xl rounded-3xl border border-red-500 bg-red-500/10 p-10 text-center text-red-300">
          {error || "Contract could not be found."}
        </div>
      </main>
    );
  }

  const alreadySigned = contract.status === "signed";

  const inactive =
    contract.status === "void" ||
    contract.status === "cancelled";

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
      <div className="mx-auto max-w-5xl">
        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">
            Contract Agreement
          </p>

          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-4xl font-bold md:text-6xl">
                {contract.title}
              </h1>

              <p className="mt-4 text-zinc-400">
                {contract.contract_number ?? `Contract #${contract.id}`}
              </p>
            </div>

            <span className="rounded-full border border-white/10 px-5 py-2 text-sm capitalize text-zinc-300">
              {contract.status}
            </span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Client
              </p>

              <p className="mt-2 font-semibold">
                {contract.client_name || contract.client_email}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Email
              </p>

              <p className="mt-2 break-all font-semibold">
                {contract.client_email}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Project Value
              </p>

              <p className="mt-2 font-semibold">
                {formatMoney(contract.project_value)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Due Date
              </p>

              <p className="mt-2 font-semibold">
                {formatDate(contract.due_date)}
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-8 rounded-3xl border border-red-500 bg-red-500/10 p-5 text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-8 rounded-3xl border border-green-500 bg-green-500/10 p-5 text-green-300">
            {success}
          </div>
        )}

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-zinc-500">
            Agreement Terms
          </p>

          <div className="whitespace-pre-wrap rounded-3xl border border-white/10 bg-black/40 p-6 leading-relaxed text-zinc-200">
            {contract.content}
          </div>
        </section>

        {alreadySigned ? (
          <section className="rounded-3xl border border-green-500 bg-green-500/10 p-8">
            <p className="text-sm uppercase tracking-[0.25em] text-green-300">
              Signed
            </p>

            <h2 className="mt-3 text-3xl font-bold text-green-200">
              This contract has been signed.
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-green-500/30 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-green-300">
                  Signer
                </p>

                <p className="mt-2 font-semibold">
                  {contract.signer_name}
                </p>
              </div>

              <div className="rounded-2xl border border-green-500/30 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-green-300">
                  Email
                </p>

                <p className="mt-2 break-all font-semibold">
                  {contract.signer_email}
                </p>
              </div>

              <div className="rounded-2xl border border-green-500/30 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-green-300">
                  Signed At
                </p>

                <p className="mt-2 font-semibold">
                  {formatDateTime(contract.signed_at)}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-green-500/30 bg-black/30 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-green-300">
                Electronic Signature
              </p>

              <p className="mt-4 text-4xl font-semibold italic">
                {contract.signature_text}
              </p>
            </div>
          </section>
        ) : inactive ? (
          <section className="rounded-3xl border border-red-500 bg-red-500/10 p-8 text-red-300">
            This contract is no longer active and cannot be signed.
          </section>
        ) : (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="mb-4 text-sm uppercase tracking-[0.25em] text-zinc-500">
              Sign Contract
            </p>

            <h2 className="text-3xl font-bold">
              Electronic Signature
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              By signing below, you confirm that you have reviewed and agree to
              the terms of this contract.
            </p>

            <form onSubmit={signContract} className="mt-8 grid gap-4">
              <input
                value={signerName}
                onChange={(event) => setSignerName(event.target.value)}
                placeholder="Full legal name"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <input
                type="email"
                value={signerEmail}
                onChange={(event) => setSignerEmail(event.target.value)}
                placeholder="Email address"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/40"
              />

              <input
                value={signatureText}
                onChange={(event) => setSignatureText(event.target.value)}
                placeholder="Type your signature"
                className="rounded-2xl border border-white/10 bg-black px-4 py-4 text-3xl italic outline-none focus:border-white/40"
              />

              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-zinc-300">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  className="mt-1"
                />

                <span>
                  I have read and agree to the terms of this contract. I
                  understand that typing my name acts as my electronic
                  signature.
                </span>
              </label>

              <button
                type="submit"
                disabled={signing}
                className="rounded-full bg-white px-6 py-4 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signing ? "Signing..." : "Sign Contract"}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}