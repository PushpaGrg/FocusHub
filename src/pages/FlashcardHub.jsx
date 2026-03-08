// src/pages/FlashcardHub.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { FaArrowLeft, FaPlus, FaTrash, FaPlay, FaLayerGroup, FaRedo, FaCheck, FaListUl } from "react-icons/fa";

export default function FlashcardHub({ user, onBack }) {
  const [decks, setDecks] = useState([]);
  const [activeDeck, setActiveDeck] = useState(null);
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  
  // Study Mode States
  const [isStudying, setIsStudying] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // New Card States
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newWrongOptions, setNewWrongOptions] = useState(""); // NEW: For Multiple Choice

  // Fetch User's Decks
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "flashcard_decks"), where("createdBy", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedDecks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDecks(fetchedDecks);
      if (activeDeck) {
        const updatedActive = fetchedDecks.find(d => d.id === activeDeck.id);
        if (updatedActive) setActiveDeck(updatedActive);
      }
    });
    return () => unsubscribe();
  }, [user?.uid, activeDeck]);

  const handleCreateDeck = async (e) => {
    e.preventDefault();
    if (!newDeckTitle.trim()) return;
    try {
      await addDoc(collection(db, "flashcard_decks"), {
        title: newDeckTitle.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        cards: []
      });
      setNewDeckTitle("");
      setIsCreatingDeck(false);
    } catch (err) {
      console.error("Error creating deck:", err);
    }
  };

  const handleDeleteDeck = async (deckId) => {
    try {
      await deleteDoc(doc(db, "flashcard_decks", deckId));
      if (activeDeck?.id === deckId) setActiveDeck(null);
    } catch (err) {
      console.error("Error deleting deck:", err);
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim() || !activeDeck) return;
    
    // Parse wrong options and mix them with the correct answer for the quiz format
    const wrongArr = newWrongOptions.split(',').map(s => s.trim()).filter(s => s !== "");
    // Create an array of options and randomly shuffle them
    const options = [newBack.trim(), ...wrongArr].sort(() => Math.random() - 0.5);

    const newCard = { 
        id: Date.now().toString(), 
        front: newFront.trim(), 
        back: newBack.trim(), 
        options: options // Store shuffled options for the Live Quiz
    };
    
    const updatedCards = [...(activeDeck.cards || []), newCard];

    try {
      await updateDoc(doc(db, "flashcard_decks", activeDeck.id), { cards: updatedCards });
      setNewFront("");
      setNewBack("");
      setNewWrongOptions("");
    } catch (err) {
      console.error("Error adding card:", err);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!activeDeck) return;
    const updatedCards = activeDeck.cards.filter(c => c.id !== cardId);
    try {
      await updateDoc(doc(db, "flashcard_decks", activeDeck.id), { cards: updatedCards });
    } catch (err) {
      console.error("Error deleting card:", err);
    }
  };

  const startStudying = (deck) => {
    if (!deck.cards || deck.cards.length === 0) return alert("Add some cards first!");
    setActiveDeck(deck);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setIsStudying(true);
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % activeDeck.cards.length);
    }, 150); 
  };

  // --- RENDER STUDY MODE ---
  if (isStudying && activeDeck) {
    const currentCard = activeDeck.cards[currentCardIndex];
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 relative">
        <button onClick={() => setIsStudying(false)} className="absolute top-8 left-8 text-white flex items-center gap-2 hover:text-gray-300 transition font-bold">
            <FaArrowLeft /> Exit Practice
        </button>
        
        <div className="text-gray-400 mb-6 font-bold uppercase tracking-widest text-sm">
            Card {currentCardIndex + 1} of {activeDeck.cards.length}
        </div>

        {/* The Flashcard */}
        <div 
            className="w-full max-w-2xl h-96 perspective-1000 cursor-pointer group"
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}>
                
                {/* Front */}
                <div className="absolute w-full h-full bg-white rounded-3xl shadow-2xl flex items-center justify-center p-10 backface-hidden border-b-8 border-blue-500">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800 text-center leading-relaxed">
                        {currentCard.front}
                    </h2>
                    <p className="absolute bottom-6 text-gray-400 text-sm font-bold flex items-center gap-2">
                        <FaRedo /> Click to flip
                    </p>
                </div>

                {/* Back */}
                <div className="absolute w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-3xl shadow-2xl flex items-center justify-center p-10 backface-hidden rotate-y-180 border-b-8 border-purple-800">
                    <h2 className="text-3xl md:text-4xl font-bold text-center leading-relaxed overflow-y-auto max-h-full">
                        {currentCard.back}
                    </h2>
                    <p className="absolute bottom-6 text-blue-200 text-sm font-bold flex items-center gap-2">
                        <FaCheck /> Answer
                    </p>
                </div>

            </div>
        </div>

        {/* Controls */}
        <div className="mt-12 flex gap-4">
            <button onClick={nextCard} className="px-8 py-4 bg-white text-gray-900 rounded-full font-bold shadow-lg hover:scale-105 transition flex items-center gap-2">
                Next Card <FaPlay />
            </button>
        </div>

        <style>{`
            .perspective-1000 { perspective: 1000px; }
            .transform-style-3d { transform-style: preserve-3d; }
            .backface-hidden { backface-visibility: hidden; }
            .rotate-y-180 { transform: rotateY(180deg); }
        `}</style>
      </div>
    );
  }

  // --- RENDER HUB MODE ---
  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 pb-24 pt-8 px-6">
            <div className="max-w-6xl mx-auto">
                <button onClick={onBack} className="text-white flex items-center gap-2 hover:opacity-80 transition font-bold mb-8">
                    <FaArrowLeft /> Back to Dashboard
                </button>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div className="text-white">
                        <h1 className="text-4xl font-black mb-2 flex items-center gap-3"><FaLayerGroup /> Flashcard & Quiz Hub</h1>
                        <p className="text-blue-100 font-medium">Create decks. Use them for solo practice or live multiplayer quizzes.</p>
                    </div>
                    {!activeDeck && (
                        <button onClick={() => setIsCreatingDeck(true)} className="bg-white text-blue-600 px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition flex items-center gap-2 whitespace-nowrap">
                            <FaPlus /> New Deck
                        </button>
                    )}
                </div>
            </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 -mt-16 relative z-10">
            
            {isCreatingDeck && (
                <form onSubmit={handleCreateDeck} className="bg-white p-6 rounded-2xl shadow-xl mb-8 flex flex-col md:flex-row gap-4 animate-slideDown border border-gray-100">
                    <input 
                        value={newDeckTitle} 
                        onChange={(e) => setNewDeckTitle(e.target.value)}
                        placeholder="e.g., Biology 101, Data Structures..." 
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-medium"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setIsCreatingDeck(false)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition">Cancel</button>
                        <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition">Create</button>
                    </div>
                </form>
            )}

            {!activeDeck ? (
                /* Deck List View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {decks.length === 0 && !isCreatingDeck && (
                        <div className="col-span-full bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 text-center text-gray-400">
                            <FaLayerGroup className="text-4xl mx-auto mb-3" />
                            <p className="font-bold text-lg text-gray-600">No decks found.</p>
                            <p>Create your first deck to start studying!</p>
                        </div>
                    )}
                    {decks.map(deck => (
                        <div key={deck.id} className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:-translate-y-1 transition-transform flex flex-col group">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-gray-800 truncate pr-4">{deck.title}</h3>
                                <button onClick={() => handleDeleteDeck(deck.id)} className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                    <FaTrash />
                                </button>
                            </div>
                            <p className="text-gray-500 font-medium mb-6 flex-1 text-sm bg-gray-50 p-3 rounded-xl">
                                {deck.cards?.length || 0} Cards
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setActiveDeck(deck)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition text-sm">
                                    Manage Cards
                                </button>
                                <button onClick={() => startStudying(deck)} className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 text-sm">
                                    <FaPlay /> Solo Practice
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Active Deck / Edit View */
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-fadeIn">
                    <div className="bg-gray-50 border-b border-gray-100 p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <div>
                            <button onClick={() => setActiveDeck(null)} className="text-blue-600 font-bold text-sm mb-1 hover:underline">← All Decks</button>
                            <h2 className="text-2xl font-black text-gray-800">{activeDeck.title}</h2>
                        </div>
                        <button onClick={() => startStudying(activeDeck)} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2">
                            <FaPlay /> Solo Practice
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Add Card Form */}
                        <form onSubmit={handleAddCard} className="flex flex-col gap-4 mb-8 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Question (Front)</label>
                                    <input value={newFront} onChange={e => setNewFront(e.target.value)} placeholder="e.g. What is the capital of France?" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correct Answer (Back)</label>
                                    <input value={newBack} onChange={e => setNewBack(e.target.value)} placeholder="e.g. Paris" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Wrong Options (Optional, for Live Quiz)</label>
                                <input value={newWrongOptions} onChange={e => setNewWrongOptions(e.target.value)} placeholder="e.g. London, Berlin, Madrid (Comma separated)" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-sm" />
                            </div>
                            <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm mt-2">
                                Save Card to Deck
                            </button>
                        </form>

                        {/* Cards List */}
                        <div className="space-y-3">
                            {!activeDeck.cards || activeDeck.cards.length === 0 ? (
                                <p className="text-center text-gray-400 py-8 font-medium">This deck is empty. Add a card above.</p>
                            ) : (
                                activeDeck.cards.map((card, index) => (
                                    <div key={card.id} className="flex items-stretch bg-white border border-gray-200 rounded-xl overflow-hidden group hover:border-blue-300 transition">
                                        <div className="bg-gray-50 px-4 py-4 border-r border-gray-200 flex items-center justify-center text-gray-400 font-bold text-sm w-12">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                                            <div className="p-4">
                                                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Question</p>
                                                <p className="font-medium text-gray-800 text-sm">{card.front}</p>
                                            </div>
                                            <div className="p-4">
                                                <p className="text-xs text-green-500 font-bold uppercase mb-1 flex items-center gap-1"><FaCheck /> Correct Answer</p>
                                                <p className="font-bold text-gray-800 text-sm mb-2">{card.back}</p>
                                                
                                                {card.options && card.options.length > 1 && (
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><FaListUl /> Options</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {card.options.map((opt, i) => (
                                                                <span key={i} className={`text-[10px] px-2 py-0.5 rounded border ${opt === card.back ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                                                    {opt}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteCard(card.id)} className="px-4 text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100">
                                            <FaTrash />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
        <style>{`
          .animate-slideDown { animation: slideDown 0.3s ease-out; }
          @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
    </div>
  );
}