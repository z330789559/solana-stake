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
    // const info = await provider.connection.getAccountInfo(mintCollAccount);
    // console.log(info)
    // if (info) {
    //     return; // Do not attempt to initialize if already initialized
    // }
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
//stake, nft_mint,receipt_account,metadata_account,master_edition_account,collection_master_edition,
// collection_metadata_account,payer,rent,system_program,associated_token_program,token_program,token_metadata_program

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

describe("anchor-token",  () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AnchorToken as Program<AnchorToken>;

  // Metaplex Constants
    const userKeyPair= Keypair.generate();
  const METADATA_SEED = "metadata";
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );
  const adminKeyPair= Keypair.fromSecretKey(
        new Uint8Array([  68,204,182,136,63,94,90,250,207,47,64,171,238,65,90,48,177,42,3,74,238,142,87,102,49,31,150,162,180,14,17,38,78,112,166,45,182,188,172,3,120,148,74,81,179,101,154,84,255,59,164,230,48,173,88,55,18,219,196,209,161,58,101,24])
  )

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


    beforeEach(async () => {
     await provider.connection.requestAirdrop(
         provider.wallet.publicKey,
         10000000 * anchor.web3.LAMPORTS_PER_SOL
     );

        await provider.connection.requestAirdrop(
            userKeyPair.publicKey,
            100000000 * anchor.web3.LAMPORTS_PER_SOL
        );
        // Call the `initToken` function to initialize the mint account
        const transferTransaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: provider.wallet.publicKey,
                toPubkey: userKeyPair.publicKey,
                lamports: 10000 * anchor.web3.LAMPORTS_PER_SOL,
            })
        );


       await provider.sendAndConfirm(transferTransaction);
     const balance = await provider.connection.getBalance(userKeyPair.publicKey);
     console.log(`Airdropped 1 SOL to account ${userKeyPair.publicKey.toBase58()}, balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
      const collectMintKeyPair= Keypair.generate();
     //1. 创建collect mint账号




   // await initNft(nft, payer, stake, nftMetadata, masterEditionAccount, collectionMasterEdition, collectMetadata, collect, TOKEN_METADATA_PROGRAM_ID, program, nft_metatdata, provider);
 })

  it("initialize", async () => {
    // Check if the mint account already exists
      const {collection,collectMetadata,collection_master_edition} = await getCollectAccount(provider, adminKeyPair, stake, METADATA_SEED, TOKEN_METADATA_PROGRAM_ID,program);
      console.log("mintCollAccount",collection)
      await initStake(provider, mint, stake, metadataAddress, payer, TOKEN_METADATA_PROGRAM_ID, program, metadata);
      await createNftCollect(provider, collection, collectMetadata,collection_master_edition,TOKEN_METADATA_PROGRAM_ID, stake, payer, program, collect_metadata);
      await initNft( payer, stake, collection_master_edition, collectMetadata, collection, TOKEN_METADATA_PROGRAM_ID, program, nft_metatdata, provider,userKeyPair);
  });


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
    console.log(`  https://explorer.solana.com/tx/${txHash}?cluster=devnet`);

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


  it.skip("mint_nft", async () => {
      console.log("  Mint not found. Attempting to initialize.");
      const {collection,collectMetadata,collection_master_edition} = await getCollectAccount(provider, adminKeyPair, stake, METADATA_SEED, TOKEN_METADATA_PROGRAM_ID,program);


      await initNft( payer, stake, collectionMasterEdition, collectMetadata, collect, TOKEN_METADATA_PROGRAM_ID, program, nft_metatdata, provider,userKeyPair);
      console.log('minted 0')
      await initNft(payer, stake, collectionMasterEdition, collectMetadata, collect, TOKEN_METADATA_PROGRAM_ID, program, nft_metatdata, provider, userKeyPair);
      console.log('minted 1')
      await initNft(payer, stake, collectionMasterEdition, collectMetadata, collect, TOKEN_METADATA_PROGRAM_ID, program, nft_metatdata, provider, userKeyPair);
      console.log('minted 2')

  });

 it.skip("mint_extra_nft", async () => {

     const {collection,collectMetadata,collection_master_edition} = await getCollectAccount(provider, adminKeyPair, stake, METADATA_SEED, TOKEN_METADATA_PROGRAM_ID,program);

        const receive = anchor.utils.token.associatedAddress({
            mint: nft,
            owner: payer,
        });

//stake, nft_mint,receipt_account,metadata_account,master_edition_account,collection_master_edition,
// collection_metadata_account,payer,rent,system_program,associated_token_program,token_program,token_metadata_program

        const context = {
            stake,
            nftMint:nft,
            receiptAccount: receive,
            metadataAccount: nftMetadata,
            masterEditionAccount: collection_master_edition,
            collectionMasterEdition:collection_master_edition,
            collectionMetadataAccount: collectMetadata,
            collection: collection,
            payer,
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        };

        const txHash = await program.methods
            .mintExtraNft(nft_metatdata)
            .accounts(context)
            .rpc();
        await provider.connection.confirmTransaction(txHash, "finalized");
        console.log(`  https://explorer.solana.com/tx/${txHash}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);

        const fanoutV0Account = await program.account.stake.fetch(stake);

        console.log('newStake',fanoutV0Account)

        // const receiveInfo = await provider.connection.getAccountInfo(receive);
        // console.log('receiveInfo',receiveInfo)



        const ataAccountInfo = await provider.connection.getParsedAccountInfo(receive);

        if (ataAccountInfo.value) {
            console.log(`receive Account Info: ${JSON.stringify(ataAccountInfo.value.data)}`);
        } else {
            console.log("No data found at the associated address.");
        }
        const metaplex = new Metaplex(provider.connection);


        const nftByMint =   await metaplex.nfts().findByMint({mintAddress: nft})
        console.log('nftByMint',nftByMint)

        // const nftBymeta =   await metaplex.nfts().findByMetadata({metadata: nftMetadata})
        // console.log('nftByMint',nftBymeta)

        const receiveNft =   await metaplex.nfts().findAllByOwner({owner: receive})
        console.log('nftByMint',receiveNft,"receive",receive,"nft",nft,"nftMetadata",nftMetadata,"stake",stake)

        const metaData = await provider.connection.getAccountInfo(nftMetadata);

        if (metaData) {
            console.log(`ATA Account Info: ${JSON.stringify(metaData.data)}`);
        } else {
            console.log("No data found at the associated address.");
        }

        const largestAccounts = await provider.connection.getTokenLargestAccounts(
            new PublicKey(nft)
        );
        const largestAccountInfo = await provider.connection.getParsedAccountInfo(
            largestAccounts.value[0].address
        );
        console.log("largestAccountInfo",largestAccountInfo.value);

    });
});
