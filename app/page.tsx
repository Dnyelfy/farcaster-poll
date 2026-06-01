"use client";
import { useState } from "react";

const CONTRACT_ADDRESS = "0xb496Ee4aEF089eb519bEB77Ce4440caF50Cec651";

const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "_question", "type": "string" },
      { "internalType": "string[]", "name": "_options", "type": "string[]" }
    ],
    "name": "createPoll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_pollId", "type": "uint256" },
      { "internalType": "uint256", "name": "_optionIndex", "type": "uint256" }
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export default function Home() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [view, setView] = useState<"home" | "create">("home");
  const [wallet, setWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2105" }],
      });
      setWallet(accounts[0]);
    } else {
      alert("Please install MetaMask!");
    }
  };

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };

  const updateOption = (i: number, val: string) => {
    const updated = [...options];
    updated[i] = val;
    setOptions(updated);
  };

  const publishPoll = async () => {
    if (!wallet) { alert("Connect wallet first!"); return; }
    if (!question || options.filter(o => o).length < 2) { alert("Fill question and at least 2 options!"); return; }

    setLoading(true);
    try {
      const { ethers } = await import("ethers");
      const provider = new (ethers as any).BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new (ethers as any).Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.createPoll(question, options.filter(o => o));
      setTxHash(tx.hash);
      await tx.wait();
      alert("Poll published on Base! 🎉");
      setView("home");
      setQuestion("");
      setOptions(["", ""]);
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-4 pt-12">
      <h1 className="text-3xl font-bold mb-1">🗳️ Farcaster Poll</h1>
      <p className="text-gray-400 mb-4">On-chain polls, share on Farcaster</p>

      <div className="mb-8">
        {wallet ? (
          <div className="bg-gray-800 px-4 py-2 rounded-xl text-sm text-green-400">
            ✅ {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </div>
        ) : (
          <button onClick={connectWallet} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl">
            Connect Wallet
          </button>
        )}
      </div>

      {view === "home" && (
        <div className="w-full max-w-md">
          <button onClick={() => setView("create")} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl mb-6">
            + Create Poll
          </button>
          <div className="bg-gray-900 rounded-xl p-4 mb-4">
            <p className="font-semibold mb-3">What is the best feature of Base?</p>
            {["Cheap gas ⛽", "Speed ⚡", "Coinbase support 🏦", "Ecosystem 🌐"].map((opt, i) => (
              <button key={i} className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-2 mb-2">{opt}</button>
            ))}
            <p className="text-gray-500 text-sm mt-2">24 votes • 2 hours left</p>
          </div>
        </div>
      )}

      {view === "create" && (
        <div className="w-full max-w-md bg-gray-900 rounded-xl p-6">
          <button onClick={() => setView("home")} className="text-gray-400 mb-4">← Back</button>
          <h2 className="text-xl font-bold mb-4">New Poll</h2>
          <input
            className="w-full bg-gray-800 rounded-lg px-4 py-3 mb-4 outline-none"
            placeholder="Write your question..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
          {options.map((opt, i) => (
            <input key={i} className="w-full bg-gray-800 rounded-lg px-4 py-3 mb-2 outline-none"
              placeholder={`Option ${i + 1}`} value={opt} onChange={e => updateOption(i, e.target.value)} />
          ))}
          {options.length < 4 && (
            <button onClick={addOption} className="text-purple-400 text-sm mb-4">+ Add option</button>
          )}
          <button onClick={publishPoll} disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 font-bold py-3 rounded-xl mt-2">
            {loading ? "Publishing to Base..." : "Publish on Base 🚀"}
          </button>
          {txHash && (
            <a href={`https://basescan.org/tx/${txHash}`} target="_blank" className="text-blue-400 text-sm mt-2 block text-center">
              View on Basescan ↗
            </a>
          )}
        </div>
      )}
    </main>
  );
}