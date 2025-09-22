import { useState, useEffect } from "react";

export type GiftMapping = Record<number, string>;

const STORAGE_KEY = "tiktokGiftMapping";

export const defaultMapping: GiftMapping = {
  5655: "🌹 Rose",
  5827: "🍦 Ice Cream Cone",
  6247: "💖 Heart",
  6650: "🎁 Gift Box",
  7037: "🎤 Mic",
  7349: "🎉 Celebration",
  7933: "🥤 Boba",
  8495: "🪽 Fairy Wings",
  8763: "🚗 Sports Car",
  9097: "🎂 Birthday Cake",
  9210: "🪩 Disco Ball",
  10262: "🐉 Dragon",
  10448: "🤍 White Rose",
  10504: "🎆 Fireworks",
  11287: "💍 Diamond Ring",
  11888: "🏰 Castle",
  12345: "🚀 Rocket",
  12899: "🛳 Luxury Cruise",
  13123: "🦄 Unicorn Fantasy",
  14555: "👑 Crown",
  15001: "🏆 Trophy",
};

export function useGiftMapping() {
  const [giftMapping, setGiftMapping] = useState<GiftMapping>(defaultMapping);

  // Load dari localStorage saat pertama kali
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGiftMapping({ ...defaultMapping, ...parsed });
      } catch (e) {
        console.error("❌ Failed to parse saved gift mapping:", e);
      }
    }
  }, []);

  // Simpan otomatis ke localStorage tiap kali ada update
  const saveGiftMapping = (mapping: GiftMapping) => {
    setGiftMapping(mapping);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
  };

  return { giftMapping, setGiftMapping: saveGiftMapping };
}
