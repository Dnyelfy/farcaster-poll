"use client";
import { useState } from "react";

const MOODS = [
  { id: 1, emoji: "🔥", label: "Harika" },
  { id: 2, emoji: "😊", label: "İyi" },
  { id: 3, emoji: "😐", label: "Normal" },
  { id: 4, emoji: "😔", label: "Kötü" },
];

export default function Home() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [view, setView] = useState<"home" | "create">("home");

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };

  const updateOption = (i: number, val: string) => {
    const updated = [...options];
    updated[i] = val;
    setOptions(updated);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-4 pt-12">
      <h1 className="text-3xl font-bold mb-1">🗳️ Farcaster Poll</h1>
      <p className="text-gray-400 mb-8">On-chain anketler, Farcaster'da paylaş</p>

      {view === "home" && (
        <div className="w-full max-w-md">
          <button
            onClick={() => setView("create")}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl mb-6"
          >
            + Anket Oluştur
          </button>
          <div className="bg-gray-900 rounded-xl p-4 mb-4">
            <p className="font-semibold mb-3">Base'in en iyi özelliği ne?</p>
            {["Ucuz gas ⛽", "Hız ⚡", "Coinbase desteği 🏦", "Ekosistem 🌐"].map((opt, i) => (
              <button key={i} className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-2 mb-2">
                {opt}
              </button>
            ))}
            <p className="text-gray-500 text-sm mt-2">24 oy • 2 saat kaldı</p>
          </div>
        </div>
      )}

      {view === "create" && (
        <div className="w-full max-w-md bg-gray-900 rounded-xl p-6">
          <button onClick={() => setView("home")} className="text-gray-400 mb-4">← Geri</button>
          <h2 className="text-xl font-bold mb-4">Yeni Anket</h2>
          <input
            className="w-full bg-gray-800 rounded-lg px-4 py-3 mb-4 outline-none"
            placeholder="Sorunuzu yazın..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
          {options.map((opt, i) => (
            <input
              key={i}
              className="w-full bg-gray-800 rounded-lg px-4 py-3 mb-2 outline-none"
              placeholder={`Seçenek ${i + 1}`}
              value={opt}
              onChange={e => updateOption(i, e.target.value)}
            />
          ))}
          {options.length < 4 && (
            <button onClick={addOption} className="text-purple-400 text-sm mb-4">+ Seçenek ekle</button>
          )}
          <button className="w-full bg-purple-600 hover:bg-purple-700 font-bold py-3 rounded-xl mt-2">
            Yayınla
          </button>
        </div>
      )}
    </main>
  );
}