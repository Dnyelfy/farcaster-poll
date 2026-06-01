"use client";
import { useState, useEffect } from "react";

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
  },
  {
    "inputs": [],
    "name": "pollCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_pollId", "type": "uint256" }],
    "name": "getOptions",
    "outputs": [{ "internalType": "string[]", "name": "", "type": "string[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "polls",
    "outputs": [
      { "internalType": "address", "name": "creator", "type": "address" },
      { "internalType": "string", "name": "question", "type": "string" },
      { "internalType": "bool", "name": "active", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_pollId", "type": "uint256" },
      { "internalType": "uint256", "name": "_optionIndex", "type": "uint256" }
    ],
    "name": "getVotes",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

type Poll = {
  id: number;
  question: string;
  options: string[];
  votes: number[];
  creator: string;
};

export default function Home() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [view, setView] = useState<"home" | "create" | "profile">("home");
  const [wallet, setWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const getContract = async (write = false) => {
    const { ethers } = await import("ethers");
    const provider = new (ethers as any).BrowserProvider((window as any).ethereum);
    if (write) {
      const signer = await provider.getSigner();
      return new (ethers as any).Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    }
    return new (ethers as any).Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  };

  const loadPolls = async () => {
    if (!(window as any).ethereum) return;
    setLoading(true);
    try {
      const contract = await getContract();
      const count = Number(await contract.pollCount());
      const loaded: Poll[] = [];
      for (let i = 0; i < count; i++) {
        const poll = await contract.polls(i);
        const opts = await contract.getOptions(i);
        const votes = await Promise.all(opts.map((_: any, j: number) => contract.getVotes(i, j).then(Number)));
        loaded.push({ id: i, question: poll.question, options: opts, votes, creator: poll.creator });
      }
      setPolls(loaded.reverse());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const connectWallet = async () => {
    if ((window as any).ethereum) {
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2105" }],
      });
      setWallet(accounts[0]);
      loadPolls();
    } else {
      alert("Please install MetaMask!");
    }
  };

  const publishPoll = async () => {
    if (!wallet) { alert("Connect wallet first!"); return; }
    if (!question || options.filter(o => o).length < 2) { alert("Fill question and at least 2 options!"); return; }
    setPublishing(true);
    try {
      const contract = await getContract(true);
      const tx = await contract.createPoll(question, options.filter(o => o));
      await tx.wait();
      setLastTxHash(tx.hash);
      alert("Poll published on Base! 🎉");
      setView("home");
      setQuestion("");
      setOptions(["", ""]);
      loadPolls();
    } catch (e: any) { alert("Error: " + e.message); }
    setPublishing(false);
  };

  const vote = async (pollId: number, optionIndex: number, pollQuestion: string, optionText: string) => {
    if (!wallet) { alert("Connect wallet first!"); return; }
    setVotingId(pollId);
    try {
      const contract = await getContract(true);
      const tx = await contract.vote(pollId, optionIndex);
      await tx.wait();
      setLastTxHash(tx.hash);
      
      const shareText = `I just voted "${optionText}" on "${pollQuestion}" 🗳️\n\nVote on Farcaster Poll — on-chain polls on Base!\n\nhttps://farcaster-poll-xi.vercel.app`;
      const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      const basescanUrl = `https://basescan.org/tx/${tx.hash}`;

      const choice = window.confirm("Vote submitted! 🎉\n\nShare your vote?\n\nOK = Warpcast | Cancel = Skip");
      if (choice) window.open(warpcastUrl, "_blank");
      
      loadPolls();
    } catch (e: any) { alert("Error: " + e.message); }
    setVotingId(null);
  };

  const shareOnX = (poll: Poll) => {
    const total = poll.votes.reduce((a, b) => a + b, 0);
    const results = poll.options.map((opt, i) => {
      const pct = total > 0 ? Math.round((poll.votes[i] / total) * 100) : 0;
      return `${opt}: ${pct}%`;
    }).join(" | ");
    const text = `📊 "${poll.question}"\n${results}\n\nVote on-chain on Base!\nhttps://farcaster-poll-xi.vercel.app`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareOnWarpcast = (poll: Poll) => {
    const text = `🗳️ "${poll.question}"\n\nVote on-chain on Base!\nhttps://farcaster-poll-xi.vercel.app`;
    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`, "_blank");
  };

  const myPolls = polls.filter(p => wallet && p.creator.toLowerCase() === wallet.toLowerCase());

  useEffect(() => {
    if ((window as any).ethereum) loadPolls();
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-4 pt-8">
      <h1 className="text-3xl font-bold mb-1">🗳️ Farcaster Poll</h1>
      <p className="text-gray-400 mb-4">On-chain polls on Base</p>

      <div className="mb-4 flex items-center gap-2">
        {wallet ? (
          <>
            <div className="bg-gray-800 px-4 py-2 rounded-xl text-sm text-green-400">
              ✅ {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </div>
            <button onClick={() => setView("profile")} className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded-xl">
              👤 Profile
            </button>
            <button onClick={() => setWallet(null)} className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded-xl">
              Disconnect
            </button>
          </>
        ) : (
          <button onClick={connectWallet} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl">
            Connect Wallet
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setView("home")} className={`px-4 py-2 rounded-xl text-sm font-bold ${view === "home" ? "bg-purple-600" : "bg-gray-800"}`}>
          All Polls
        </button>
        {wallet && (
          <button onClick={() => setView("profile")} className={`px-4 py-2 rounded-xl text-sm font-bold ${view === "profile" ? "bg-purple-600" : "bg-gray-800"}`}>
            My Polls ({myPolls.length})
          </button>
        )}
        <button onClick={() => setView("create")} className={`px-4 py-2 rounded-xl text-sm font-bold ${view === "create" ? "bg-purple-600" : "bg-gray-800"}`}>
          + Create
        </button>
      </div>

      {/* Poll List */}
      {(view === "home" || view === "profile") && (
        <div className="w-full max-w-md">
          {loading && <p className="text-center text-gray-400">Loading polls...</p>}

          {(view === "home" ? polls : myPolls).map(poll => {
            const total = poll.votes.reduce((a, b) => a + b, 0);
            return (
              <div key={poll.id} className="bg-gray-900 rounded-xl p-4 mb-4">
                <p className="font-semibold mb-3">{poll.question}</p>
                {poll.options.map((opt, i) => {
                  const pct = total > 0 ? Math.round((poll.votes[i] / total) * 100) : 0;
                  return (
                    <button key={i} onClick={() => vote(poll.id, i, poll.question, opt)} disabled={votingId === poll.id}
                      className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-2 mb-2 relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full bg-purple-900 opacity-50 transition-all" style={{ width: `${pct}%` }} />
                      <span className="relative">{opt}</span>
                      <span className="relative float-right text-gray-400 text-sm">{pct}% ({poll.votes[i]})</span>
                    </button>
                  );
                })}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-gray-500 text-sm">{total} votes • {poll.creator.slice(0, 6)}...{poll.creator.slice(-4)}</p>
                  <div className="flex gap-2">
                    <button onClick={() => shareOnWarpcast(poll)} className="text-purple-400 text-xs hover:text-purple-300">
                      🟣 Cast
                    </button>
                    <button onClick={() => shareOnX(poll)} className="text-blue-400 text-xs hover:text-blue-300">
                      𝕏 Share
                    </button>
                    <a href={`https://basescan.org/address/${CONTRACT_ADDRESS}`} target="_blank"
                      className="text-green-400 text-xs hover:text-green-300">
                      🔍 Base
                    </a>
                  </div>
                </div>
              </div>
            );
          })}

          {!loading && (view === "home" ? polls : myPolls).length === 0 && (
            <p className="text-center text-gray-500">
              {view === "profile" ? "You haven't created any polls yet." : "No polls yet. Create the first one!"}
            </p>
          )}
        </div>
      )}

      {/* Create Poll */}
      {view === "create" && (
        <div className="w-full max-w-md bg-gray-900 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">New Poll</h2>
          <input className="w-full bg-gray-800 rounded-lg px-4 py-3 mb-4 outline-none"
            placeholder="Write your question..." value={question} onChange={e => setQuestion(e.target.value)} />
          {options.map((opt, i) => (
            <input key={i} className="w-full bg-gray-800 rounded-lg px-4 py-3 mb-2 outline-none"
              placeholder={`Option ${i + 1}`} value={opt} onChange={e => { const u = [...options]; u[i] = e.target.value; setOptions(u); }} />
          ))}
          {options.length < 4 && (
            <button onClick={() => setOptions([...options, ""])} className="text-purple-400 text-sm mb-4">+ Add option</button>
          )}
          <button onClick={publishPoll} disabled={publishing}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 font-bold py-3 rounded-xl mt-2">
            {publishing ? "Publishing..." : "Publish on Base 🚀"}
          </button>
          {lastTxHash && (
            <a href={`https://basescan.org/tx/${lastTxHash}`} target="_blank"
              className="text-green-400 text-sm mt-3 block text-center">
              🔍 View last tx on Basescan ↗
            </a>
          )}
        </div>
      )}
    </main>
  );
}