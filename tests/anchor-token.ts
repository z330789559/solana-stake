import * as anchor from "@coral-xyz/anchor";
import {AnchorProvider, Program} from "@coral-xyz/anchor";
import web3_js, {
    ComputeBudgetProgram,
    Keypair,
    PublicKey, sendAndConfirmRawTransaction,
    sendAndConfirmTransaction,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction, TransactionSignature
} from "@solana/web3.js";
import { assert } from "chai";
import BN from "bn.js";
import { AnchorToken } from "../app/src/idl/anchor_token";
import  {Metaplex} from "@metaplex-foundation/js";
import buffer from "buffer";
import * as spl from "@solana/spl-token"


async function createNftCollect(provider: AnchorProvider, mintCollAccount: PublicKey,collectMetadata: PublicKey,collection_master_edition:PublicKey, TOKEN_METADATA_PROGRAM_ID: PublicKey, stake: PublicKey,payer: PublicKey, program: Program<AnchorToken>, collect_metadata: {
    symbol: string;
    decimals: number;
    name: string;
    uri: string
}) {
    const info = await provider.connection.getAccountInfo(mintCollAccount);
    console.log(info)
    if (info) {
        return; // Do not attempt to initialize if already initialized
    }
    const receiptAccount = anchor.utils.token.associatedAddress({
        mint: mintCollAccount,
        owner: stake,
    });
    // Define the accounts and arguments for the `initToken` function call
    const context = {
        stake,
        metadata: collectMetadata,
        collectionMasterEdition: collection_master_edition,
        receiptAccount:receiptAccount,
        mint: mintCollAccount,
        payer,
        // metadata: tokenMetadata,
        // mint: collect_mint,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    };

    // Call the `initToken` function to initialize the mint account
    const txHash = await program.methods
        .initNftCollect(collect_metadata)
        .accounts(context)
        .rpc();

    // Wait for confirmation and log transaction details
    await provider.connection.confirmTransaction(txHash, "finalized");
    console.log(`https://explorer.solana.com/tx/${txHash}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);

    // Verify that the mint account was initialized
    const newInfo = await provider.connection.getAccountInfo(mintCollAccount);
    console.log('newInfo', newInfo)
    const fanoutV0Account = await program.account.stake.fetch(stake);

    console.log('newStake', fanoutV0Account)
}

async function initNft(payer: PublicKey, stake: PublicKey, collectionMasterEdition: PublicKey, collectMetadata: PublicKey, collect: PublicKey, TOKEN_METADATA_PROGRAM_ID: PublicKey, program: Program<AnchorToken>, nft_metatdata: {
    symbol: string;
    name: string;
    uri: string
}, provider: AnchorProvider, userKeyPair: Keypair) {

    const fanoutV0Account = await program.account.stake.fetch(stake);

    console.log('newStake', fanoutV0Account)
    //nft
    const [nft1] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft"), Buffer.from(fanoutV0Account.id.toString())],
        program.programId
    );

    const [nftMetadata] =  PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            nft1.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
    );
    const [masterEditionAccount] =  PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            nft1.toBuffer(),
            Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
    );
    const receive = anchor.utils.token.associatedAddress({
        mint: nft1,
        owner: userKeyPair.publicKey,
    });
    console.log("masterEditionAccount", masterEditionAccount,"player", payer)
//stake, nft_mint,receipt_account,metadata_account,master_edition_account,collection_master_edition,
// collection_metadata_account,payer,rent,system_program,associated_token_program,token_program,token_metadata_program
 console.log(
      stake,
        nft1,
        receive,
        nftMetadata,
        masterEditionAccount,
        collectionMasterEdition,
        collectMetadata,
        collect,
        payer,
        SYSVAR_RENT_PUBKEY,
        SystemProgram.programId,
        anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        anchor.utils.token.TOKEN_PROGRAM_ID,
        TOKEN_METADATA_PROGRAM_ID

 )
    const context = {
        stake,
        nftMint: nft1,
        receiptAccount: receive,
        metadataAccount: nftMetadata,
        masterEditionAccount: masterEditionAccount,
        collectionMasterEdition: collectionMasterEdition,
        collectionMetadataAccount: collectMetadata,
        collection: collect,
        payer,
        user: userKeyPair.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    };

    const txb = await program.methods
        .mintNft(nft_metatdata)
        .accounts(context)
        .transaction()
    let tx = new Transaction();
// needs to be the first instruction
// experiment with this number to find one where the transaction succeeds.
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }));
    tx.add(txb);
  let hash=  await provider.sendAndConfirm(tx);
    // const transactionSignature= await provider.connection.sendTransaction(tx, [provider.wallet] )
    console.log(`  https://explorer.solana.com/tx/${hash}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);


    // const receiveInfo = await provider.connection.getAccountInfo(receive);
    // console.log('receiveInfo',receiveInfo)


    const ataAccountInfo = await provider.connection.getParsedAccountInfo(receive);

    if (ataAccountInfo.value) {
        console.log(`receive Account Info: ${JSON.stringify(ataAccountInfo.value.data)}`);
    } else {
        console.log("No data found at the associated address.");
    }
    const metaplex = new Metaplex(provider.connection);


    const nftByMint = await metaplex.nfts().findByMint({mintAddress: nft1})
    console.log('nftByMint', nftByMint)

    // const nftBymeta =   await metaplex.nfts().findByMetadata({metadata: nftMetadata})
    // console.log('nftByMint',nftBymeta)

    const receiveNft = await metaplex.nfts().findAllByOwner({owner: receive})
    console.log('nftByMint', receiveNft, "receive", receive, "nft", nft1, "nftMetadata", nftMetadata, "stake", stake)

    const metaData = await provider.connection.getAccountInfo(nftMetadata);

    if (metaData) {
        console.log(`ATA Account Info: ${JSON.stringify(metaData.data)}`);
    } else {
        console.log("No data found at the associated address.");
    }

    const largestAccounts = await provider.connection.getTokenLargestAccounts(
        new PublicKey(nft1)
    );
    const largestAccountInfo = await provider.connection.getParsedAccountInfo(
        largestAccounts.value[0].address
    );
    console.log("largestAccountInfo", largestAccountInfo.value);
    return [nft1,receive];
}

async function initStake(provider: AnchorProvider, mint: PublicKey, stake: PublicKey, metadataAddress: PublicKey, payer: PublicKey, TOKEN_METADATA_PROGRAM_ID: PublicKey, program: Program<AnchorToken>, metadata: {
    symbol: string;
    decimals: number;
    name: string;
    uri: string
}) {
    const info = await provider.connection.getAccountInfo(mint);
    if (info) {
        return; // Do not attempt to initialize if already initialized
    }
    console.log("  Mint not found. Attempting to initialize.");

    // Define the accounts and arguments for the `initToken` function call
    const context = {
        stake,
        metadata: metadataAddress,
        mint,
        payer,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    };

    // Call the `initToken` function to initialize the mint account
    const txHash = await program.methods
        .initToken(metadata)
        .accounts(context)
        .rpc();

    // Wait for confirmation and log transaction details
    await provider.connection.confirmTransaction(txHash, "finalized");
    console.log(`  https://explorer.solana.com/tx/${txHash}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);

    // Verify that the mint account was initialized
    const newInfo = await provider.connection.getAccountInfo(mint);
    assert(newInfo, "  Mint should be initialized.");

    const fanoutV0Account = await program.account.stake.fetch(stake);

    console.log('newStake', fanoutV0Account)
}

async function getCollectAccount(provider: AnchorProvider, adminKeyPair: Keypair, stake: PublicKey, METADATA_SEED: string, TOKEN_METADATA_PROGRAM_ID: PublicKey, program: Program<AnchorToken>) {
    // const mintCollAccount = await spl.createMint(provider.connection, adminKeyPair, stake, stake, 0)
      const [mintCollAccount] = PublicKey.findProgramAddressSync(
        [stake.toBuffer(),Buffer.from("collect")],
          program.programId
    );

    const [collection_master_edition] = PublicKey.findProgramAddressSync(
        [
            Buffer.from(METADATA_SEED),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mintCollAccount.toBuffer(),
            Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
    );
    const [collectMetadata] = PublicKey.findProgramAddressSync(
        [
            Buffer.from(METADATA_SEED),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mintCollAccount.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
    );
    return {
        collection: mintCollAccount,
        collectMetadata,
        collection_master_edition
    };
}
async function stakeNft(provider: AnchorProvider, mint: PublicKey, stake: PublicKey,  user: Keypair, sendAccount: PublicKey, program: Program<AnchorToken>) {
    const [custody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"),user.publicKey.toBuffer(), mint.toBuffer()],
        program.programId
    );

    const receive = anchor.utils.token.associatedAddress({
        mint: mint,
        owner: stake,
    });
    const context = {
        stake,
        custody,
        nftMint:mint,
        sendAccount,
        receive,
        user: user.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    };
// Call the `mintTokens` function to mint tokens
    const txHash = await program.methods
        .stakeNft()
        .accounts(context)
        .signers([user])
        .rpc();
    await provider.connection.confirmTransaction(txHash);
    console.log(`  https://explorer.solana.com/tx/${txHash}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);

    const metaplex = new Metaplex(provider.connection);
    const nftByMint = await metaplex.nfts().findByMint({mintAddress: mint})
    console.log('nftByMint', nftByMint)

    let custody1 = await program.account.custody.fetch(custody);
    console.log('custody1', custody1)

    const ataSendInfo = await provider.connection.getParsedAccountInfo(sendAccount);

    if (ataSendInfo.value) {
        console.log(`sendAccount Account Info: ${JSON.stringify(ataSendInfo.value.data)}`);
    } else {
        console.log("No data found at the associated address.");
    }
    const atareceiveInfo = await provider.connection.getParsedAccountInfo(receive);

    if (atareceiveInfo.value) {
        console.log(`sendAccount Account Info: ${JSON.stringify(atareceiveInfo.value.data)}`);
    } else {
        console.log("No data found at the associated address.");
    }
    console.log("user {:?}", user.publicKey)
    return [custody,receive]

}

async function unstakeNft(provider: AnchorProvider, nftMint: PublicKey, stake: PublicKey, userKeyPair: Keypair, userReceive: PublicKey, custody: PublicKey, holdAccount: PublicKey, tokenMint: PublicKey,program: Program<AnchorToken>) {
    const [reward] = PublicKey.findProgramAddressSync(
        [Buffer.from("reward"),userKeyPair.publicKey.toBuffer()],
        program.programId
    );

    const receiveReward = anchor.utils.token.associatedAddress({
        mint: tokenMint,
        owner: userKeyPair.publicKey,
    });
    const context = {
        stake,
        holdAccount:holdAccount,
        nftMint,
            receive:userReceive,
      reward,
        custody,
        user: userKeyPair.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    };
    const txHash = await program.methods
        .unStake()
        .accounts(context)
        .signers([userKeyPair])
        .rpc();
    await provider.connection.confirmTransaction(txHash);
    console.log(`  https://explorer.solana.com/tx/${txHash}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);

    const metaplex = new Metaplex(provider.connection);
    const nftByMint = await metaplex.nfts().findByMint({mintAddress: nftMint})
    console.log('nftByMint', nftByMint)

    let custody1 = await program.account.custody.fetch(custody);
    console.log('custody1', custody1)

    let rewards  = await program.account.reward.fetch(reward);
    console.log(rewards)


}

async function mintToken(provider: AnchorProvider, userKeyPair: Keypair, stake: PublicKey, mint: PublicKey, program: Program<AnchorToken>) {

    const destination = anchor.utils.token.associatedAddress({
        mint: mint,
        owner: userKeyPair.publicKey,
    });

 const context={
     stake,
     mint,
     destination,
     payer:userKeyPair.publicKey,
     rent: SYSVAR_RENT_PUBKEY,
     systemProgram: SystemProgram.programId,
     tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
     associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
 }
    const txHash = await program.methods
        .mintTokens(new BN(100 * 10 ** 9 ))
        .accounts(context)
        .signers([userKeyPair])
        .rpc();
    await provider.connection.confirmTransaction(txHash);
    console.log(`  https://explorer.solana.com/tx/${txHash}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);

    const metaplex = new Metaplex(provider.connection);
    const nftByMint = await metaplex.nfts().findByMint({mintAddress: mint})
    console.log('nftByMint', nftByMint)

    let custody1 = await program.account.stake.fetch(stake);
    console.log('stake', custody1)

    const  tokenBalance = await provider.connection.getTokenAccountBalance(destination)
    console.log('tokenBalance', tokenBalance)
}

async function claimRewards(provider: AnchorProvider, userKeyPair: Keypair, mint: PublicKey, stake: PublicKey, program: Program<AnchorToken>) {
    const receiveToken = anchor.utils.token.associatedAddress({
        mint: mint,
        owner: userKeyPair.publicKey,
    });
    const [reward] =PublicKey.findProgramAddressSync(
        [Buffer.from("reward"),userKeyPair.publicKey.toBuffer()],
        program.programId
    )
    const context={
        stake,
        receiveToken,
        tokenMint:mint,
        reward:reward,
        user: userKeyPair.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    }
    const txHash = await program.methods
        .claim()
        .accounts(context)
        .signers([userKeyPair])
        .rpc();
    await provider.connection.confirmTransaction(txHash);
    console.log(`  https://explorer.solana.com/tx/${txHash}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);

    const tokenBalance = await provider.connection.getTokenAccountBalance(receiveToken)
    console.log('tokenBalance', tokenBalance)


    const rewardsAmount = await  program.account.reward.fetch(reward)
    console.log('rewardsAmount', rewardsAmount)
}

describe("anchor-token",  () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
    // const program = new  anchor.Program<AnchorToken>(
    //
    // )

  const program = anchor.workspace.AnchorToken as Program<AnchorToken>;

  // Metaplex Constants
    const adminKeyPair= Keypair.fromSecretKey(
        new Uint8Array([79,222,27,49,153,92,24,31,49,5,86,84,62,24,58,31,200,179,199,58,94,74,161,82,241,74,133,201,44,159,148,9,70,20,187,118,42,175,215,35,219,99,32,202,22,252,2,74,146,139,103,114,192,16,159,102,206,30,204,194,192,78,132,222])
    );

    console.log("adminKeyPair", adminKeyPair.publicKey.toBase58())
    const METADATA_SEED = "metadata";
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );
  const userKeyPair= Keypair.fromSecretKey(
        new Uint8Array([172,148,165,89,214,130,50,246,7,36,26,112,38,133,40,132,53,199,56,106,114,41,147,86,129,163,239,9,83,199,215,243,65,165,6,66,68,62,201,59,151,117,222,39,143,34,173,6,223,55,196,36,150,167,29,226,64,189,192,162,119,130,188,97])
  )
    console.log("userKeyPair", userKeyPair.publicKey.toBase58())
  // Constants from our program
  const MINT_SEED = "mint";
  const COLLECT_SEED = "collect";
  const STAKE = "stake";
  const COLLECT_MINT = "weiland";

  const NFT_SEED = "nft";

  // Data for our tests
  const payer = provider.wallet.publicKey;
  const metadata = {
    name: "Icy",
    symbol: "ICY",
    uri: "https://cdn.discordapp.com/emojis/1192768878183465062.png?size=240&quality=lossless",
    decimals: 9,
  };
  const collect_metadata = {
    name: "IcyC",
    symbol: "ICYC",
    uri: "https://cdn.discordapp.com/emojis/1192768878183465062.png?size=240&quality=lossless",
    decimals: 0,
  }


  const nft_metatdata ={
      name: "NFT",
      symbol: "NFT",
      uri: "https://cdn.discordapp.com/emojis/1192768878183465062.png?size=240&quality=lossless",
  }
  const mintAmount = 10;

  // Derive the public key for our mint account
  const [mint] = PublicKey.findProgramAddressSync(
    [Buffer.from(MINT_SEED)],
    program.programId
  );




  const [collect] = PublicKey.findProgramAddressSync(
    [Buffer.from(COLLECT_SEED)],
      program.programId
  );


  const [stake] = PublicKey.findProgramAddressSync(
    [Buffer.from(STAKE)],
    program.programId
  );


  //nft
    const [nft] = PublicKey.findProgramAddressSync(
        [Buffer.from(NFT_SEED)],
        program.programId
    );

  const [nftMetadata] =  PublicKey.findProgramAddressSync(
      [
        Buffer.from(METADATA_SEED),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          nft.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
  );
  // Derive the public key for our metadata account using the Metaplex program
  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_SEED),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );


 const [collectionMasterEdition] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_SEED),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      collect.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
    );

    const user2KeyPair= Keypair.generate();
    beforeEach(async () => {
     await provider.connection.requestAirdrop(
         provider.wallet.publicKey,
         10000000 * anchor.web3.LAMPORTS_PER_SOL
     );

        await provider.connection.requestAirdrop(
            userKeyPair.publicKey,
            100000000 * anchor.web3.LAMPORTS_PER_SOL
        );

        let tx = new Transaction();
        // Call the `initToken` function to initialize the mint account
        const transferTransaction = tx.add(
            SystemProgram.transfer({
                fromPubkey: provider.wallet.publicKey,
                toPubkey: userKeyPair.publicKey,
                lamports: 10000 * anchor.web3.LAMPORTS_PER_SOL,
            })
        );

        const transferTransaction2 = tx.add(
            SystemProgram.transfer({
                fromPubkey: provider.wallet.publicKey,
                toPubkey: user2KeyPair.publicKey,
                lamports: 10000 * anchor.web3.LAMPORTS_PER_SOL,
            })
        );
       await provider.sendAndConfirm(tx);
     const balance = await provider.connection.getBalance(userKeyPair.publicKey);
     console.log(`Airdropped 1 SOL to account ${userKeyPair.publicKey.toBase58()}, balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
      const collectMintKeyPair= Keypair.generate();
     // 1. 创建collect mint账号




   // await initNft(nft, payer, stake, nftMetadata, masterEditionAccount, collectionMasterEdition, collectMetadata, collect, TOKEN_METADATA_PROGRAM_ID, program, nft_metatdata, provider);
 })


    it.skip("print address", async ()=>{
        const {collection,collectMetadata,collection_master_edition} = await getCollectAccount(provider, adminKeyPair, stake, METADATA_SEED, TOKEN_METADATA_PROGRAM_ID,program);
        console.log("mintCollAccount: ",collection,collectMetadata,collection_master_edition,collection_master_edition)
    })
  it.skip("initialize", async () => {
    // Check if the mint account already exists
      const {collection,collectMetadata,collection_master_edition} = await getCollectAccount(provider, adminKeyPair, stake, METADATA_SEED, TOKEN_METADATA_PROGRAM_ID,program);
      console.log("mintCollAccount",collection)
      await initStake(provider, mint, stake, metadataAddress, payer, TOKEN_METADATA_PROGRAM_ID, program, metadata);
      await createNftCollect(provider, collection, collectMetadata,collection_master_edition,TOKEN_METADATA_PROGRAM_ID, stake, payer, program, collect_metadata);
     let [nftMint,userReceive]= await initNft( payer, stake, collection_master_edition, collectMetadata, collection, TOKEN_METADATA_PROGRAM_ID, program, nft_metatdata, provider,userKeyPair);
      let [custody,holdAccount] = await stakeNft(provider, nftMint, stake, userKeyPair, userReceive, program);
      await unstakeNft(provider, nftMint, stake, userKeyPair, userReceive,custody,holdAccount,mint, program);

      await claimRewards(provider, userKeyPair, mint, stake, program);
      await initNft( payer, stake, collection_master_edition, collectMetadata, collection, TOKEN_METADATA_PROGRAM_ID, program, nft_metatdata, provider,userKeyPair);

      // await initNft( payer, stake, collection_master_edition, collectMetadata, collection, TOKEN_METADATA_PROGRAM_ID, program, nft_metatdata, provider,user2KeyPair);
  });

    it.skip("mint_token", async()=>{
        const {collection,collectMetadata,collection_master_edition} = await getCollectAccount(provider, adminKeyPair, stake, METADATA_SEED, TOKEN_METADATA_PROGRAM_ID,program);
        console.log("mintCollAccount",collection)
        await initStake(provider, mint, stake, metadataAddress, payer, TOKEN_METADATA_PROGRAM_ID, program, metadata);
         await mintToken(provider,userKeyPair,stake,mint,program);
    })

  it.skip("create_nft_collect", async () => {
    // Check if the mint account already exists
      const {collection,collectMetadata,collection_master_edition} = await getCollectAccount(provider, adminKeyPair, stake, METADATA_SEED, TOKEN_METADATA_PROGRAM_ID,program);

      await createNftCollect(provider, collection, collectMetadata,collection_master_edition,TOKEN_METADATA_PROGRAM_ID, stake, payer, program, collect_metadata);


  });
  it.skip("mint tokens", async () => {
    // Derive the associated token account address for the payer
    const destination = anchor.utils.token.associatedAddress({
      mint: mint,
      owner: payer,
    });

    // Get initial token balance (0 if account not yet created)
    let initialBalance: number;
    try {
      const balance = await provider.connection.getTokenAccountBalance(
        destination
      );
      initialBalance = balance.value.uiAmount;
    } catch {
      // Token account not yet initiated has 0 balance
      initialBalance = 0;
    }

    // Define the accounts and arguments for the `mintTokens` function call
    const context = {
      mint,
      destination,
      payer,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    };

    // Call the `mintTokens` function to mint tokens
    const txHash = await program.methods
      .mintTokens(new BN(mintAmount * 10 ** metadata.decimals))
      .accounts(context)
      .rpc();
    await provider.connection.confirmTransaction(txHash);
    console.log(`  https://explorer.solana.com/tx/${txHash}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);

    // check icy balance of payer
    const postBalance = (
      await provider.connection.getTokenAccountBalance(destination)
    ).value.uiAmount;
    assert.equal(
      initialBalance + mintAmount,
      postBalance,
      "Post balance should equal initial plus mint amount"
    );
  });


  it("mint_nft", async () => {
      console.log("  Mint not found. Attempting to initialize.");
      const {collection,collectMetadata,collection_master_edition} = await getCollectAccount(provider, adminKeyPair, stake, METADATA_SEED, TOKEN_METADATA_PROGRAM_ID,program);


      await initNft( payer, stake, collectionMasterEdition, collectMetadata, collect, TOKEN_METADATA_PROGRAM_ID, program, nft_metatdata, provider,userKeyPair);
      console.log('minted 0')

  });

});
