import { Link } from "react-router-dom";
import { FileCheck2, ShieldCheck, Wallet } from "lucide-react";

function Home() {
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="rounded-2xl bg-blue-700 p-10 text-white shadow-xl">
          <ShieldCheck size={42} />
          <h1 className="mt-5 text-4xl font-bold">PramaanChain</h1>
          <p className="mt-3 max-w-2xl text-blue-100">
            Verify certificate proofs publicly, or sign in with a wallet to use
            institution and citizen services.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/verify"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-semibold text-blue-700"
            >
              <FileCheck2 size={18} />
              Verify a document
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-blue-300 px-5 py-3 font-semibold"
            >
              <Wallet size={18} />
              Wallet sign-in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
