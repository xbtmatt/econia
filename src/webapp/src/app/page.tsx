"use client";
import Image from "next/image";
import styles from "./page.module.css";
import WebSocketDemo from "@/components/WebsocketDemo";

export default function Home() {
  return (
    <main className={styles.main}>
      <WebSocketDemo></WebSocketDemo>
    </main>
  );
}
