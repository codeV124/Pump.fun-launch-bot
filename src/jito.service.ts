import bs58 from "bs58";
import axios from "axios";
import { PublicKey } from "@solana/web3.js";

const MAX_CHECK_JITO = 30;

type Region = "ams" | "ger" | "ny" | "tokyo";
const regions = ["ams", "ger", "ny", "tokyo"] as Region[];
let idx = 0;

const wait = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));

const TIP_ACCOUNTS = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
].map((pubkey) => new PublicKey(pubkey));

const endpoints = {
  ams: "https://amsterdam.mainnet.block-engine.jito.wtf",
  ger: "https://frankfurt.mainnet.block-engine.jito.wtf",
  ny: "https://ny.mainnet.block-engine.jito.wtf",
  tokyo: "https://tokyo.mainnet.block-engine.jito.wtf",
};

export const getJitoTipAccount = () =>
  TIP_ACCOUNTS[Math.floor(Math.random() * TIP_ACCOUNTS.length)];

class JitoBundleService {
  endpoint: string;
  constructor() {
    idx = (idx + 1) % regions.length;
    const _region = regions[idx];
    this.endpoint = endpoints[_region];
  }

  updateRegion() {
    idx = (idx + 1) % regions.length;
    const _region = regions[idx];
    this.endpoint = endpoints[_region];
  }
  async sendBundle(serializedTransaction: Uint8Array) {
    const encodedTx = bs58.encode(serializedTransaction);
    const jitoURL = `${this.endpoint}/api/v1/bundles`; // ?uuid=${JITO_UUID}
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "sendBundle",
      params: [[encodedTx]],
    };

    try {
      const response = await axios.post(jitoURL, payload, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data.result;
    } catch (error) {
      console.error("cannot send!:", error);
      return null;
    }
  }

  async getBundleStatus(bundleId: string) {
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "getBundleStatuses",
      params: [[bundleId]],
    };

    let retries = 0;
    while (retries < MAX_CHECK_JITO) {
      try {
        retries++;
        this.updateRegion();
        const jitoURL = `${this.endpoint}/api/v1/bundles`; // ?uuid=${JITO_UUID}

        const response = await axios.post(jitoURL, payload, {
          headers: { "Content-Type": "application/json" },
        });

        if (!response || response.data.result.value.length <= 0) {
          await wait(1000);
          continue;
        }

        const bundleResult = response.data.result.value[0];
        if (
          bundleResult?.confirmation_status === "processed" ||
          bundleResult?.confirmation_status === "confirmed" ||
          bundleResult?.confirmation_status === "finalized"
        ) {
          retries = 0;
          console.log("🎉 JitoTransaction confirmed!", Date.now());
          break;
        }
      } catch (error) {
        console.error("GetBundleStatus Failed");
      }
    }
    if (retries === 0) return true;
    return false;
  }
}

export const jitoBundleService = new JitoBundleService();
