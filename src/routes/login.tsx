import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import mark from "@/assets/vouga-mark-cream.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/engineers", replace: true });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else navigate({ to: "/engineers", replace: true });
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#0b0b0a] text-[#ece8de] md:grid-cols-2">
      {/* marca topo-esquerdo */}
      <div className="absolute left-8 top-7 z-10 flex items-center gap-2.5">
        <img src={mark} alt="Vouga" className="h-6 w-6" />
        <span className="font-serif text-xl leading-none">Vouga OS</span>
      </div>
      <p className="absolute bottom-7 left-8 z-10 font-mono text-[10px] uppercase tracking-[0.16em] text-[#6b665b]">
        © Vouga Agency 2026 · todos os direitos reservados
      </p>

      {/* painel esquerdo: símbolo + cruz */}
      <div className="relative hidden overflow-hidden bg-black md:block">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/10" />
        <div className="absolute left-1/4 top-0 h-full w-px bg-white/[0.04]" />
        <div className="absolute left-3/4 top-0 h-full w-px bg-white/[0.04]" />
        <div className="absolute inset-0 grid place-items-center">
          <img src={mark} alt="" className="h-28 w-28 opacity-90" />
        </div>
      </div>

      {/* painel direito: formulário */}
      <div className="relative flex flex-col justify-center bg-[#121210] px-10 py-16 md:px-16">
        <h1 className="font-serif text-6xl font-light tracking-tight">Login</h1>

        <form onSubmit={onSubmit} className="mt-12 grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#9d998c]">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="miguel@vouga.com"
              className="mt-2 w-full border-0 border-b border-white/25 bg-transparent pb-2 text-[15px] text-[#ece8de] outline-none placeholder:text-[#56524a] focus:border-[var(--ring)]"
            />
          </div>
          <div>
            <label htmlFor="password" className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#9d998c]">Palavra-passe</label>
            <div className="relative">
              <input
                id="password"
                type={show ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="mt-2 w-full border-0 border-b border-white/25 bg-transparent pb-2 pr-7 text-[15px] text-[#ece8de] outline-none placeholder:text-[#56524a] focus:border-[var(--ring)]"
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute bottom-2 right-0 text-[#9d998c] hover:text-[#ece8de]" aria-label="Mostrar palavra-passe">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between sm:col-span-2">
            <button type="button" onClick={() => setRemember((r) => !r)} className="flex items-center gap-2 text-sm text-[#9d998c] hover:text-[#ece8de]">
              <span className={`grid h-4 w-4 place-items-center rounded-full border ${remember ? "border-[var(--ring)] bg-[var(--ring)]" : "border-white/30"}`}>
                {remember && <span className="h-1.5 w-1.5 rounded-full bg-black" />}
              </span>
              Manter sessão
            </button>
          </div>

          <div className="mt-8 sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#ece8de] px-7 py-3 text-sm font-medium text-black transition-colors hover:bg-white disabled:opacity-60"
            >
              {submitting ? "A entrar…" : <>Entrar <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </form>

        <p className="mt-10 text-xs text-[#6b665b]">Acesso restrito à equipa Vouga.</p>
      </div>
    </div>
  );
}
