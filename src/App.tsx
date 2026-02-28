/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import robertoImg from './assets/roberto.jpg';

import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';

import {
  Gift,
  ExternalLink,
  CheckCircle,
  Unlock,
  MessageCircle,
  Info,
  AlertTriangle,
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import CryptoJS from 'crypto-js';

// Initial data as requested
const INITIAL_LINKS = [
  "https://s.shopee.com.br/7VBHV3iL8X",
  "https://s.shopee.com.br/4LEFjGxuzc",
  "https://s.shopee.com.br/15GZLVLUz",
  "https://s.shopee.com.br/8pgf5cNEmg",
  "https://s.shopee.com.br/8V3oh2alBy",
  "https://s.shopee.com.br/gKxMhTpug",
  "https://s.shopee.com.br/3fyYwFqjiV",
  "https://s.shopee.com.br/30is93b4dx",
  "https://s.shopee.com.br/6KzK7DsNGZ",
  "https://s.shopee.com.br/5q33WLWrTB",
  "https://s.shopee.com.br/9KcvgoaXAn",
  "https://s.shopee.com.br/W1XAcgU0Z",
  "https://s.shopee.com.br/7VBHVX1UZf",
  "https://s.shopee.com.br/AKVSsllIAU",
  "https://s.shopee.com.br/6KzK7S8iY4",
  "https://s.shopee.com.br/15GZqELw2",
  "https://s.shopee.com.br/AAC2gaDxwJ",
  "https://s.shopee.com.br/1gDUZ0IiLm",
  "https://s.shopee.com.br/807Y6g2jVq",
  "https://s.shopee.com.br/15Ga0RucT",
  "https://s.shopee.com.br/2g62tDPVCC"
];

interface GiftItem {
  id: string;
  url: string;
  title: string | null;
  image: string | null;
  purchased: boolean;
  purchasedAt: any;
  pinHash: string | null;
}

export default function App() {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPinModal, setShowPinModal] = useState<{ id: string, pin: string } | null>(null);
  const [unmarkModal, setUnmarkModal] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [firebaseError, setFirebaseError] = useState(false);

  useEffect(() => {
    const initGifts = async () => {
      try {
        const giftsCol = collection(db, "gifts");
        const querySnapshot = await getDocs(giftsCol);

        if (querySnapshot.empty) {
          // Seed the database (apenas 21 itens)
          for (let i = 0; i < INITIAL_LINKS.length; i++) {
            const id = `item${String(i + 1).padStart(2, '0')}`;
            const item: GiftItem = {
              id,
              url: INITIAL_LINKS[i],
              title: `Sugestão de presente #${i + 1}`,
              image: null,
              purchased: false,
              purchasedAt: null,
              pinHash: null
            };
            await setDoc(doc(db, "gifts", id), item);
          }
        }

        // ✅ Correções permanentes no banco (mesmo se já estiver preenchido)
        // 1) Corrigir link do item21
        await updateDoc(doc(db, "gifts", "item21"), {
          url: "https://s.shopee.com.br/2g62tDPVCC"
        }).catch(() => {
          // se não existir, ignora
        });

        // 2) Remover item22 (sem afetar os demais)
        await deleteDoc(doc(db, "gifts", "item22")).catch(() => {
          // se não existir, ignora
        });

      } catch (e) {
        console.error("Error initializing gifts:", e);
        setFirebaseError(true);
      }
    };

    initGifts();

    const unsubscribe = onSnapshot(collection(db, "gifts"), (snapshot) => {
      const items: GiftItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as GiftItem);
      });

      // ✅ garante que o item22 não apareça mesmo se existir por algum motivo
      const filtered = items.filter((it) => it.id !== 'item22');

      setGifts(filtered.sort((a, b) => a.id.localeCompare(b.id)));
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setFirebaseError(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsPurchased = async (id: string) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const pinHash = CryptoJS.SHA256(pin).toString();

    try {
      await updateDoc(doc(db, "gifts", id), {
        purchased: true,
        purchasedAt: serverTimestamp(),
        pinHash: pinHash
      });
      setShowPinModal({ id, pin });
    } catch (e) {
      alert("Erro ao marcar como comprado. Verifique sua conexão.");
    }
  };

  const unmarkPurchased = async () => {
    if (!unmarkModal) return;

    const item = gifts.find(g => g.id === unmarkModal);
    if (!item) return;

    const inputHash = CryptoJS.SHA256(pinInput).toString();

    if (inputHash === item.pinHash) {
      try {
        await updateDoc(doc(db, "gifts", unmarkModal), {
          purchased: false,
          purchasedAt: null,
          pinHash: null
        });
        setUnmarkModal(null);
        setPinInput('');
        setPinError(false);
      } catch (e) {
        alert("Erro ao desmarcar.");
      }
    } else {
      setPinError(true);
    }
  };

  if (firebaseError) {
    return (
      <div className="min-h-screen bg-george-blue flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md text-center border-4 border-george-brown">
          <AlertTriangle className="w-16 h-16 text-george-red mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-george-brown mb-4">Configuração Necessária</h1>
          <p className="text-gray-600 mb-6">
            O Firebase não está configurado. Por favor, adicione as chaves do Firebase no arquivo .env para que a lista funcione.
          </p>
          <div className="text-sm text-left bg-gray-100 p-4 rounded-xl font-mono">
            VITE_FIREBASE_API_KEY=...<br />
            VITE_FIREBASE_PROJECT_ID=...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-george-blue font-sans text-george-brown pb-12">
      {/* Header */}
      <header className="bg-george-yellow pt-8 pb-12 px-4 rounded-b-[3rem] shadow-lg border-b-4 border-george-brown relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="grid grid-cols-6 gap-4 p-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="w-8 h-8 bg-george-brown rounded-full" />
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto flex flex-col items-center text-center relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-32 h-32 rounded-full border-4 border-george-brown overflow-hidden mb-4 shadow-xl bg-white"
          >
            <img
              src={robertoImg}
              alt="Roberto"
              className="w-full h-full object-cover"
              style={{ objectPosition: '50% 25%' }}
            />
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight drop-shadow-sm">
            Roberto – 1 aninho 🎈
          </h1>
          <p className="text-lg font-medium opacity-90 mb-6">
            George o Curioso está vindo para a festa!
          </p>

          <a
            href="https://wa.me/5531975086567"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-green-600 transition-all active:scale-95"
          >
            <MessageCircle size={20} />
            Falar no WhatsApp
          </a>
        </div>
      </header>

      {/* Instructions */}
      <section className="max-w-4xl mx-auto -mt-6 px-4 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-md border-2 border-george-brown/20 flex flex-col md:flex-row gap-6 items-center">
          <div className="bg-george-yellow/20 p-4 rounded-2xl">
            <Info className="w-8 h-8 text-george-brown" />
          </div>
          <div className="flex-1 text-sm md:text-base space-y-2">
            <p>1) Ao clicar, você será direcionado para um <strong>link externo</strong> em uma nova aba.</p>
            <p>2) Depois da compra, volte para esta página e marque como <strong>COMPRADO</strong> para evitar presentes repetidos.</p>
          </div>
        </div>
      </section>

      {/* Gift Grid */}
      <main className="max-w-6xl mx-auto px-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-bounce bg-george-yellow p-4 rounded-full border-2 border-george-brown">
              <Gift className="w-8 h-8" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {gifts.map((item) => (
              <motion.div
                layout
                key={item.id}
                className={`bg-white rounded-[2rem] overflow-hidden border-2 transition-all shadow-sm ${item.purchased
                  ? 'opacity-60 grayscale border-gray-300'
                  : 'border-george-brown/10 hover:shadow-xl hover:-translate-y-1'
                  }`}
              >
                <div className="aspect-square bg-gray-50 relative overflow-hidden group">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title || ''}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-george-brown/20">
                      <Gift size={48} />
                    </div>
                  )}

                  {item.purchased && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                      <div className="bg-white text-george-brown px-4 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-lg transform -rotate-12 border-2 border-george-brown">
                        Indisponível
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-lg mb-4 line-clamp-2 min-h-[3.5rem]">
                    {item.title || `Sugestão #${item.id.replace('item', '')}`}
                  </h3>

                  <div className="space-y-2">
                    {!item.purchased ? (
                      <>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-george-blue text-george-brown font-bold py-3 rounded-2xl hover:bg-opacity-80 transition-all"
                        >
                          <ExternalLink size={18} />
                          Abrir link
                        </a>
                        <button
                          onClick={() => markAsPurchased(item.id)}
                          className="flex items-center justify-center gap-2 w-full bg-george-yellow text-george-brown font-bold py-3 rounded-2xl hover:bg-opacity-90 transition-all border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1"
                        >
                          <CheckCircle size={18} />
                          Marcar comprado
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setUnmarkModal(item.id)}
                        className="flex items-center justify-center gap-2 w-full bg-gray-200 text-gray-600 font-bold py-3 rounded-2xl hover:bg-gray-300 transition-all"
                      >
                        <Unlock size={18} />
                        Desmarcar
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* PIN Display Modal */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border-4 border-george-yellow"
            >
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600 w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black mb-2">Obrigado!</h2>
              <p className="text-gray-600 mb-6">Guarde este PIN caso precise desmarcar o presente depois:</p>

              <div className="bg-george-yellow/20 text-4xl font-black py-4 rounded-2xl border-2 border-dashed border-george-yellow mb-6 tracking-[0.5em] pl-[0.5em]">
                {showPinModal.pin}
              </div>

              <button
                onClick={() => setShowPinModal(null)}
                className="w-full bg-george-brown text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                Entendi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unmark Modal (PIN Input) */}
      <AnimatePresence>
        {unmarkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-[3rem] shadow-2xl max-w-sm w-full border-4 border-george-brown"
            >
              <h2 className="text-2xl font-black mb-4 text-center">Desmarcar Item</h2>
              <p className="text-gray-600 mb-6 text-center text-sm">Digite o PIN de 6 dígitos gerado quando você marcou este item.</p>

              <div className="mb-6">
                <input
                  type="text"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/\D/g, ''));
                    setPinError(false);
                  }}
                  placeholder="000000"
                  className={`w-full text-center text-3xl font-black py-4 rounded-2xl border-2 tracking-widest focus:outline-none focus:ring-4 focus:ring-george-blue ${pinError ? 'border-george-red bg-red-50' : 'border-gray-200'
                    }`}
                />
                {pinError && (
                  <p className="text-george-red text-xs font-bold mt-2 text-center">PIN incorreto. Tente novamente.</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setUnmarkModal(null);
                    setPinInput('');
                    setPinError(false);
                  }}
                  className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={unmarkPurchased}
                  className="flex-1 bg-george-brown text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-12 text-center text-george-brown/60 text-sm px-4">
        <p>© 2024 Roberto – 1 aninho</p>
        <p className="mt-1 italic">Feito com carinho para o nosso pequeno curioso.</p>
      </footer>
    </div>
  );
}