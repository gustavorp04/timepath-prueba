"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, User, Lock, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        setShake(true);
        setTimeout(() => setShake(false), 400);
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Error de conexión. Revisa tu internet.");
      setLoading(false);
    }
  }

  return (
    <main className="w-full max-w-md mx-auto h-[100dvh] sm:h-[800px] sm:max-h-[90vh] bg-slate-50 sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col sm:border-[8px] sm:border-slate-800">
      <div className="flex-1 flex flex-col items-center justify-center p-8 fade-in">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
          <Zap className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">TimePath</h1>
        <p className="text-slate-500 text-sm text-center mb-10 font-medium">
          Fracciona tus proyectos.
          <br />
          Vence la procrastinación.
        </p>

        <form
          onSubmit={handleSubmit}
          className={`w-full space-y-4 ${shake ? "animate-shake" : ""}`}
        >
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">
              Usuario
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="usuario1"
                autoCapitalize="none"
                autoComplete="username"
                className="w-full p-3.5 pl-11 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••"
                autoComplete="current-password"
                className="w-full p-3.5 pl-11 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-xs font-bold text-center fade-in">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors active:scale-95 shadow-lg shadow-blue-200 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              "Verificando..."
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Entrar
              </>
            )}
          </button>
        </form>

        <p className="text-[10px] text-slate-400 mt-8 text-center">
          Prototipo de prueba · usuarios: usuario1 … usuario5 · clave: 123
        </p>
      </div>
    </main>
  );
}
