import {
  buyAmount,
  connection,
  duration_buy,
  duration_sell,
  jitoTip,
  max_n,
  slippage,
  token_n,
  wallet,
} from "./config";
import {
  PublicKey,
  VersionedTransaction,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
  TransactionMessage,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import base58 from "bs58";
import BN from 'bn.js'
import fs from "fs";
import { getJitoTipAccount, jitoBundleService } from "./jito.service";
import { ASSOC_TOKEN_ACC_PROG, EVENT_AUTHORITY, FEE_ATA, FEE_PUMP, FEE_RECIPIENT, GLOBAL, MINT_AUTHORITY, MPL_TOKEN_METADATA_PROGRAM_ID, PUMP_FUN_PROGRAM, RENT, SYSTEM_PROGRAM_ID, TOKEN_DECIMALS } from "./constants";
import { bufferFromUInt64, sleepTime } from "./utils";
import {
  keypairIdentity,
  Metaplex,
} from "@metaplex-foundation/js";

type MetaPlexParam = {
  name: string,
  symbol: string,
  uri: string
}

const sendBundle = async (instructions: TransactionInstruction[], keypairs: Keypair[], retry: boolean = false): Promise<boolean> => {
  const { blockhash } = await connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: keypairs[0].publicKey,
    instructions,
    recentBlockhash: blockhash,
  }).compileToV0Message();

  const vTxn = new VersionedTransaction(messageV0);
  vTxn.sign(keypairs);

  const rawTxn = vTxn.serialize();
  const bundleId = await jitoBundleService.sendBundle(rawTxn);
  const isConfirmed = await jitoBundleService.getBundleStatus(bundleId);
  if(isConfirmed)
    return true;
  else{
    if(retry)
      return await sendBundle(instructions, keypairs, true);
    else
      return false;
  }
}

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(wallet));

async function uploadMetaData(index: number): Promise<MetaPlexParam>{
  try {
    const metaDatas = JSON.parse(fs.readFileSync(`./token.json`, 'utf-8'));
    const { uri } = await metaplex.nfts().uploadMetadata(metaDatas[index]);
    const splMetaData = { name: metaDatas[index].name, symbol: metaDatas[index].symbol, uri};
    console.log('- New SPL metadata:', splMetaData);
    return splMetaData;
  } catch (error) {
    console.error("Error uploading token metadata:", error);
    throw error;
  }
}

function getTokenAmount(solAmount: number){
  let virtualSolReserves = 30 * LAMPORTS_PER_SOL;
  let virtualTokenReserves = 1073000000 * TOKEN_DECIMALS;
  let realSolReserves = 0;
  let realTokenReserves = 793100000 * TOKEN_DECIMALS;
  let totalTokensBought = 0;
  const e = new BN(solAmount);
  // const e = solAmount;
  virtualSolReserves += realSolReserves;
  const a = new BN(virtualSolReserves).mul(new BN(virtualTokenReserves));
  const i = new BN(virtualSolReserves).add(e);
  const l = a.div(i).add(new BN(1));
  let tokensToBuy = new BN(virtualTokenReserves).sub(l);
  tokensToBuy = BN.min(tokensToBuy, new BN(realTokenReserves));

  const tokensBought = tokensToBuy.toNumber();

  realSolReserves += e.toNumber();
  realTokenReserves -= tokensBought;
  virtualTokenReserves -= tokensBought;
  totalTokensBought += tokensBought;
  return tokensToBuy;
}

function getBuyInstruction(mint: PublicKey, bondingCurve: PublicKey, associatedBondingCurve: PublicKey, maxSol: number, splOut: number, keypair: Keypair){
  
  const tokenATA = spl.getAssociatedTokenAddressSync(
    mint,
    keypair.publicKey,
    true
  );
  const buyKeys = [
    { pubkey: GLOBAL, isSigner: false, isWritable: false },
    { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    {
      pubkey: associatedBondingCurve,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: tokenATA, isSigner: false, isWritable: true },
    { pubkey: keypair.publicKey, isSigner: false, isWritable: true },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: spl.TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: RENT, isSigner: false, isWritable: false },
    { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
    { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false },
  ];

  const buyData = Buffer.concat([
    bufferFromUInt64("16927863322537952870"),
    bufferFromUInt64(splOut),
    bufferFromUInt64(maxSol),
  ]);

  const buyInstruction = new TransactionInstruction({
    keys: buyKeys,
    programId: PUMP_FUN_PROGRAM,
    data: buyData,
  });

  return buyInstruction;
}

function getSellInstruction(mint: PublicKey, bondingCurve: PublicKey, associatedBondingCurve: PublicKey, splIn: number, keypair: Keypair){
  
  const tokenATA = spl.getAssociatedTokenAddressSync(
    mint,
    keypair.publicKey,
    true
  );
  const sellKeys = [
    { pubkey: GLOBAL, isSigner: false, isWritable: false },
    { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    {
      pubkey: associatedBondingCurve,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: tokenATA, isSigner: false, isWritable: true },
    { pubkey: keypair.publicKey, isSigner: false, isWritable: true },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: ASSOC_TOKEN_ACC_PROG,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: spl.TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
    { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false },
  ];

  const sellData = Buffer.concat([
    bufferFromUInt64("12502976635542562355"),
    bufferFromUInt64(splIn),
    bufferFromUInt64(0),
  ]);

  const sellInstruction = new TransactionInstruction({
    keys: sellKeys,
    programId: PUMP_FUN_PROGRAM,
    data: sellData,
  });

  const closeIns = spl.createCloseAccountInstruction(
    tokenATA,
    keypair.publicKey,
    keypair.publicKey
  )

  return [sellInstruction, closeIns];
}

async function retrieveSOL(from: Keypair, to: Keypair, amount: number = 0) {
  console.log(`\n- Retrieving SOL from ${from.publicKey.toBase58()} to ${to.publicKey.toBase58()}`);
  const solBalance = await connection.getBalance(from.publicKey);
  const trasferAmount = amount > 0 ? (amount > solBalance? solBalance: amount) : solBalance;

  const transferSOL = SystemProgram.transfer({
    fromPubkey: from.publicKey,
    toPubkey: to.publicKey,
    lamports: trasferAmount - 10000,
  });

  const tipIxn = SystemProgram.transfer({
    fromPubkey: to.publicKey,
    toPubkey: getJitoTipAccount(),
    lamports: jitoTip,
  });

  const instructions: TransactionInstruction[] = [transferSOL, tipIxn];
    // const { blockhash } = await connection.getLatestBlockhash();
    // const sellMessageV0 = new TransactionMessage({
    //   payerKey: from.publicKey,
    //   instructions: instructions,
    //   recentBlockhash: blockhash,
    // }).compileToV0Message();

    // const vTxn = new VersionedTransaction(sellMessageV0);
    // vTxn.sign([from, to]);
    
    // const simulationResult = await connection.simulateTransaction(vTxn, {
    //   commitment: "processed",
    // });
  
    // if (simulationResult.value.err) {
    //   console.error(
    //     "* Simulation error",
    //     simulationResult.value.err,
    //     simulationResult
    //   );
    //   process.exit(1);
    // } else {
    //   console.log("- Simulation success for transaction.");
    // }

    // const rawTxn = vTxn.serialize();

    const isRetrieved = await sendBundle(instructions, [from, to]);
    if(isRetrieved)
      console.log(`- Retrived SOL ${trasferAmount / LAMPORTS_PER_SOL} SOL`);
    else{
      console.log(`- Failed retriving sol`);
      process.exit(1);
    }
}

async function createAndBuy(keypair: Keypair, splMetaData: MetaPlexParam){

  console.log(`\n- Starting new Create & Buy pumpfun token transaction with: ${keypair.publicKey.toBase58()}`);
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(keypair),
    { commitment: "processed" }
  );

  // Initialize pumpfun anchor
  const IDL_PumpFun = JSON.parse(
    fs.readFileSync("./pumpfun-IDL.json", "utf-8")
  ) as anchor.Idl;

  const program = new anchor.Program(IDL_PumpFun, PUMP_FUN_PROGRAM, provider);

  const mintKp = Keypair.generate();
  console.log(`Mint: ${mintKp.publicKey.toBase58()}`);

  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mintKp.publicKey.toBytes()],
    program.programId
  );
  const [metadata] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      MPL_TOKEN_METADATA_PROGRAM_ID.toBytes(),
      mintKp.publicKey.toBytes(),
    ],
    MPL_TOKEN_METADATA_PROGRAM_ID
  );
  let [associatedBondingCurve] = PublicKey.findProgramAddressSync(
    [
      bondingCurve.toBytes(),
      spl.TOKEN_PROGRAM_ID.toBytes(),
      mintKp.publicKey.toBytes(),
    ],
    spl.ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const createIx = await program.methods
    .create(
      splMetaData.name,
      splMetaData.symbol,
      splMetaData.uri
    )
    .accounts({
      mint: mintKp.publicKey,
      mintAuthority: MINT_AUTHORITY,
      bondingCurve,
      associatedBondingCurve,
      global: GLOBAL,
      mplTokenMetadata: MPL_TOKEN_METADATA_PROGRAM_ID,
      metadata,
      user: keypair.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      eventAuthority: EVENT_AUTHORITY,
      program: PUMP_FUN_PROGRAM,
    })
    .instruction();

  // Get the associated token address
  const ata = spl.getAssociatedTokenAddressSync(
    mintKp.publicKey,
    keypair.publicKey
  );
  const ataIx = spl.createAssociatedTokenAccountIdempotentInstruction(
    keypair.publicKey,
    ata,
    keypair.publicKey,
    mintKp.publicKey
  );

  const solBalance = await connection.getBalance(keypair.publicKey);
  const solReq = solBalance - FEE_ATA - FEE_PUMP - jitoTip;
  const solIn = solReq > buyAmount ? buyAmount : solReq;
  // const solIn = solBalance - FEE_ATA - FEE_PUMP - jitoTip;
  if(solIn <= 0)
  {
    console.log(`- Insufficient SOL to create and buy pumpfun token ${solBalance / LAMPORTS_PER_SOL} SOL`);
    process.exit(1);
  }
  const splOut = getTokenAmount(solIn);
  console.log({solAmount: solIn / LAMPORTS_PER_SOL, splAmount: splOut.toNumber() / TOKEN_DECIMALS});

  const buyIx = getBuyInstruction(mintKp.publicKey, bondingCurve, associatedBondingCurve, solReq, splOut.toNumber(), keypair);

  const sellIns = getSellInstruction(mintKp.publicKey, bondingCurve, associatedBondingCurve, splOut.toNumber(), keypair);
  
  const tipIxn = SystemProgram.transfer({
    fromPubkey: keypair.publicKey,
    toPubkey: getJitoTipAccount(),
    lamports: jitoTip,
  });

  const buyInstructions: TransactionInstruction[] = [createIx, ataIx, buyIx, tipIxn];

  // const simulationResult = await connection.simulateTransaction(buyVTxn, {
  //   commitment: "processed",
  // });

  // if (simulationResult.value.err) {
  //   console.error(
  //     "* Simulation error",
  //     simulationResult.value.err,
  //     simulationResult

  //   );
  //   process.exit(1);
  // } else {
  //   console.log("- Simulation success.");
  // }

  const isBought = await sendBundle(buyInstructions, [keypair], true);

  if(isBought){
    console.log(`- Bought ${mintKp.publicKey.toBase58()} ${splOut.toNumber() / TOKEN_DECIMALS} with ${solIn / LAMPORTS_PER_SOL} SOL`);
    await sleepTime(duration_sell);//duration before sell
    const sellInstructions: TransactionInstruction[] = [...sellIns, tipIxn];
    const isSold = await sendBundle(sellInstructions, [keypair], true);
    if(isSold)
      console.log(`- Sold ${mintKp.publicKey.toBase58()}`);
    else{
      console.log(`- Failed selling ${mintKp.publicKey.toBase58()}`);
      process.exit(1);
    }
  }else{
    process.exit(1);
  }
}

(async () => {
  console.log("- Running bot...");
  let i = 0;
  while(true){
    if(i >= max_n)
      break;
    const newWallet = Keypair.generate();
    const pk = base58.encode(newWallet.secretKey);
    fs.appendFileSync('./wallets.txt', pk + "\n");
    console.log(`- Current wallet: ${pk}`);
    const newMetaData = await uploadMetaData(i % token_n);
    await sleepTime(duration_buy);
    await retrieveSOL(wallet, newWallet, buyAmount * (1 + slippage / 100));
    await createAndBuy(newWallet, newMetaData);
    await retrieveSOL(newWallet, wallet);
    i++;
  }
})()

// (async () => {
//   uri = await uploadMetaData();
//   await createAndBuy(wallet);
// })()