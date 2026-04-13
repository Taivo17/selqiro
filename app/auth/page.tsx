"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      alert("Sisesta email ja parool.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Konto loodud. Nüüd saad sisse logida.");
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      alert("Sisesta email ja parool.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/my-page");
    router.refresh();
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    alert("Logisid välja.");
  };

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-6 py-10 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
          >
            Back to marketplace
          </Link>
        </div>

        <div className="rounded-[32px] border border-black/8 bg-white p-8 shadow-sm">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-black/40">
            Selqiro account
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Sign up / Sign in
          </h1>

          <p className="mt-3 text-black/60">
            Loo konto või logi sisse, et hiljem siduda kuulutused kindla kasutajaga.
          </p>

          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-black/70">
                Email
              </label>
              <input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black/70">
                Password
              </label>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Create account"}
            </button>

            <button
              onClick={handleSignIn}
              disabled={loading}
              className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Sign in"}
            </button>

            <button
              onClick={handleLogout}
              className="mt-2 text-sm text-black/50 transition hover:text-black"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}