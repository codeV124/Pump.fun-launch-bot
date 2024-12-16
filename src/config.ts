import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import dotenv from 'dotenv';
dotenv.config();

const RPC_URL = process.env.RPC_URL || '';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
export const wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
export const connection = new Connection(RPC_URL, "processed");

export const buyAmount = 0.1 * LAMPORTS_PER_SOL; // first buy amount; at least 0.02 SOL
export const jitoTip = 0.0001 * LAMPORTS_PER_SOL; // jito tip 
export const slippage = 50 // 100%

export const duration_buy = 5 * 1000; // 10s before new buy
export const duration_sell = 100; // 100ms before sell
export const max_n = 3; // do max_n times
export const token_n = 100; // number of token metadata info in token.json