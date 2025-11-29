import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { useEffect } from "react";

export default function TestFirebase() {
  useEffect(() => {
    async function check() {
      try {
        const snap = await getDocs(collection(db, "test"));
        console.log("✅ Firestore connected! Found:", snap.size, "docs");
      } catch (e) {
        console.error("❌ Firestore error:", e);
      }
    }
    check();
  }, []);

  return <p className="text-center mt-10 text-xl">Check console for Firebase test 🔥</p>;
}
